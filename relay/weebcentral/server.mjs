import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.RELAY_TOKEN?.trim();
const BASE = 'https://weebcentral.com';
const ID = /^[0-9A-Z]{20,32}$/;
const CACHE_LIMIT = 512;
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE || 600);

if (!TOKEN) {
  console.error('RELAY_TOKEN is required.');
  process.exit(1);
}

const cache = new Map();
const rate = new Map();

function safeTokenEquals(candidate) {
  const expected = Buffer.from(TOKEN);
  const actual = Buffer.from(candidate || '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function authorized(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return Boolean(match && safeTokenEquals(match[1]));
}

function clientIp(request) {
  const cf = request.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf;
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress || 'unknown';
}

function allowRate(request) {
  const key = clientIp(request);
  const now = Date.now();
  const current = rate.get(key);
  if (!current || current.resetAt <= now) {
    rate.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

function sanitizeQuery(value) {
  return String(value || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

function operationFromUrl(url) {
  if (url.pathname === '/v1/search') {
    const query = sanitizeQuery(url.searchParams.get('q'));
    if (!query) return null;
    const params = new URLSearchParams({
      text: query,
      sort: 'Best Match',
      order: 'Descending',
      official: 'Any',
      anime: 'Any',
      adult: 'Any',
      display_mode: 'Full Display',
      offset: '0',
    });
    return {
      key: `search:${query.toLowerCase()}`,
      ttl: 60_000,
      url: `${BASE}/search/data?${params.toString()}`,
      referer: `${BASE}/search?text=${encodeURIComponent(query)}`,
      hx: true,
      hxTarget: undefined,
    };
  }

  const match = url.pathname.match(/^\/v1\/(manga|chapters|chapter|pages)\/([0-9A-Z]{20,32})$/);
  if (!match) return null;
  const [, operation, id] = match;
  if (!ID.test(id)) return null;

  if (operation === 'manga') {
    return { key: `manga:${id}`, ttl: 300_000, url: `${BASE}/series/${id}` };
  }
  if (operation === 'chapters') {
    return {
      key: `chapters:${id}`,
      ttl: 120_000,
      url: `${BASE}/series/${id}/full-chapter-list`,
      referer: `${BASE}/series/${id}`,
      hx: true,
      hxTarget: 'chapter-list',
    };
  }
  if (operation === 'chapter') {
    return { key: `chapter:${id}`, ttl: 3_600_000, url: `${BASE}/chapters/${id}` };
  }
  return {
    key: `pages:${id}`,
    ttl: 3_600_000,
    url: `${BASE}/chapters/${id}/images?is_prev=False&reading_style=long_strip&current_page=1`,
    referer: `${BASE}/chapters/${id}`,
    hx: true,
    hxTarget: 'chapter-images',
  };
}

function upstreamHeaders(spec) {
  const headers = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'PachimangaRelay/0.1 (+https://pachimanga.frogilab.dev)',
  };
  if (spec.referer) headers.Referer = spec.referer;
  if (spec.hx) {
    headers['HX-Request'] = 'true';
    headers['HX-Current-URL'] = spec.referer || `${BASE}/`;
  }
  if (spec.hxTarget) headers['HX-Target'] = spec.hxTarget;
  return headers;
}

function setCommonHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
}

function sendJson(response, status, body) {
  response.statusCode = status;
  setCommonHeaders(response);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function sendText(response, status, body, cacheState = 'miss') {
  response.statusCode = status;
  setCommonHeaders(response);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('X-Pachimanga-Relay-Cache', cacheState);
  response.end(body);
}

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return item;
}

function putCached(key, body, ttl) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { body, expiresAt: Date.now() + ttl });
}

async function fetchUpstream(spec) {
  return fetch(spec.url, {
    headers: upstreamHeaders(spec),
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  });
}

async function upstreamHealth() {
  try {
    const response = await fetch(BASE, {
      headers: { 'User-Agent': 'PachimangaRelay/0.1 (+https://pachimanga.frogilab.dev)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
    });
    return { ok: response.ok, upstreamStatus: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'upstream request failed' };
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { ok: true, service: 'pachimanga-weebcentral-relay' });
    }

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }

    if (!authorized(request)) return sendJson(response, 401, { error: 'unauthorized' });
    if (!allowRate(request)) return sendJson(response, 429, { error: 'rate_limited' });

    if (url.pathname === '/health/upstream') {
      const result = await upstreamHealth();
      return sendJson(response, result.ok ? 200 : 503, result);
    }

    const spec = operationFromUrl(url);
    if (!spec) return sendJson(response, 404, { error: 'unsupported_operation' });

    const cached = getCached(spec.key);
    if (cached) return sendText(response, 200, cached.body, 'hit');

    const upstream = await fetchUpstream(spec);
    const body = await upstream.text();
    if (!upstream.ok) {
      return sendJson(response, upstream.status, {
        error: 'upstream_error',
        upstreamStatus: upstream.status,
      });
    }

    putCached(spec.key, body, spec.ttl);
    return sendText(response, 200, body, 'miss');
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return sendJson(response, isTimeout ? 504 : 502, {
      error: isTimeout ? 'upstream_timeout' : 'relay_failure',
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Pachimanga WeebCentral relay listening on http://${HOST}:${PORT}`);
});
