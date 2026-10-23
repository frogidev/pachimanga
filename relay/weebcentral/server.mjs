import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';
import { ALLOWED_UPSTREAM_ORIGINS, extractPageImageUrls, isProxyableImageUrl, relayOperationFromUrl, WEEBCENTRAL_ORIGIN } from './policy.mjs';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.RELAY_TOKEN?.trim();
const CACHE_LIMIT = 512;
const CACHE_MAX_BYTES = 64 * 1024 * 1024;
const CACHE_ITEM_MAX_BYTES = 4 * 1024 * 1024;
let cacheBytes = 0;
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

// shortcut: behind a trusted proxy every caller shares its address, so the limit is global; the
// bearer token already gates access. Never trust X-Forwarded-For here, callers can forge it.
function clientIp(request) {
  return request.socket.remoteAddress || 'unknown';
}

function allowRate(request) {
  const key = clientIp(request);
  const now = Date.now();
  if (rate.size > 1024) {
    for (const [ip, entry] of rate) if (entry.resetAt <= now) rate.delete(ip);
  }
  const current = rate.get(key);
  if (!current || current.resetAt <= now) {
    rate.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

function upstreamHeaders(spec) {
  const headers = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'PachimangaRelay/0.1 (+https://pachimanga.frogilab.dev)',
  };
  if (spec.referer) headers.Referer = spec.referer;
  if (spec.hx) {
    headers['HX-Request'] = 'true';
    headers['HX-Current-URL'] = spec.referer || `${WEEBCENTRAL_ORIGIN}/`;
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

function dropCached(key) {
  const item = cache.get(key);
  if (!item) return;
  cacheBytes = Math.max(0, cacheBytes - item.bytes);
  cache.delete(key);
}

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    dropCached(key);
    return null;
  }
  return item;
}

function evictOldest() {
  const oldest = cache.keys().next().value;
  if (oldest) dropCached(oldest);
}

function putCached(key, body, ttl) {
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > CACHE_ITEM_MAX_BYTES) return;
  dropCached(key);
  while (cache.size >= CACHE_LIMIT || cacheBytes + bytes > CACHE_MAX_BYTES) {
    if (!cache.size) break;
    evictOldest();
  }
  cache.set(key, { body, bytes, expiresAt: Date.now() + ttl });
  cacheBytes += bytes;
}

async function fetchUpstream(spec) {
  return fetch(spec.url, {
    headers: upstreamHeaders(spec),
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  });
}

// Page images the relay will serve: only URLs a recent WeebCentral `pages` response listed.
const IMAGE_TTL_MS = 2 * 60 * 60 * 1000;
const IMAGE_ALLOWLIST_LIMIT = 20_000;
const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const allowedImages = new Map();

function registerImages(html) {
  const expiresAt = Date.now() + IMAGE_TTL_MS;
  for (const imageUrl of extractPageImageUrls(html)) {
    allowedImages.delete(imageUrl); // re-insert so the oldest entries are evicted first
    allowedImages.set(imageUrl, expiresAt);
  }
  while (allowedImages.size > IMAGE_ALLOWLIST_LIMIT) allowedImages.delete(allowedImages.keys().next().value);
}

function imageAllowed(imageUrl) {
  const expiresAt = allowedImages.get(imageUrl);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    allowedImages.delete(imageUrl);
    return false;
  }
  return true;
}

async function serveImage(raw, response) {
  let target;
  try {
    target = new URL(String(raw || '')).href;
  } catch {
    return sendJson(response, 400, { error: 'invalid_image_url' });
  }
  if (!isProxyableImageUrl(target) || !imageAllowed(target)) return sendJson(response, 404, { error: 'unsupported_operation' });

  // Redirects are refused: the image must come from exactly the URL WeebCentral listed.
  const upstream = await fetch(target, {
    headers: { Accept: 'image/*', 'User-Agent': 'PachimangaRelay/0.1 (+https://pachimanga.frogilab.dev)' },
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok) {
    return sendJson(response, upstream.status >= 400 ? upstream.status : 502, { error: 'upstream_error', upstreamStatus: upstream.status });
  }
  const type = upstream.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('image/')) return sendJson(response, 502, { error: 'not_an_image' });
  const declared = Number(upstream.headers.get('content-length') || 0);
  if (declared > IMAGE_MAX_BYTES) return sendJson(response, 502, { error: 'image_too_large' });

  response.statusCode = 200;
  setCommonHeaders(response);
  response.setHeader('Content-Type', type);
  if (declared) response.setHeader('Content-Length', String(declared));
  let total = 0;
  for await (const chunk of upstream.body) {
    total += chunk.length;
    if (total > IMAGE_MAX_BYTES) {
      response.destroy();
      return undefined;
    }
    if (!response.write(chunk)) await once(response, 'drain');
  }
  response.end();
  return undefined;
}

async function readCappedText(upstream) {
  const declared = Number(upstream.headers.get('content-length') || 0);
  if (declared > CACHE_ITEM_MAX_BYTES) throw new Error('upstream body too large');
  const body = await upstream.text();
  if (Buffer.byteLength(body, 'utf8') > CACHE_ITEM_MAX_BYTES) throw new Error('upstream body too large');
  return body;
}

async function upstreamHealth() {
  try {
    const response = await fetch(WEEBCENTRAL_ORIGIN, {
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

    if (url.pathname === '/v1/image') return await serveImage(url.searchParams.get('u'), response);

    const spec = relayOperationFromUrl(url);
    if (!spec) return sendJson(response, 404, { error: 'unsupported_operation' });

    const cached = getCached(spec.key);
    if (cached) {
      if (spec.operation === 'pages') registerImages(cached.body);
      return sendText(response, 200, cached.body, 'hit');
    }

    const upstream = await fetchUpstream(spec);
    // A redirect must never leave the fixed upstream origins.
    if (!ALLOWED_UPSTREAM_ORIGINS.includes(new URL(upstream.url).origin)) {
      return sendJson(response, 502, { error: 'unexpected_redirect' });
    }
    const body = await readCappedText(upstream);
    if (!upstream.ok) {
      return sendJson(response, upstream.status, {
        error: 'upstream_error',
        upstreamStatus: upstream.status,
      });
    }

    putCached(spec.key, body, spec.ttl);
    if (spec.operation === 'pages') registerImages(body);
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
