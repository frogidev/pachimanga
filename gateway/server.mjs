import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const BASE = 'https://weebcentral.com';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://pachimanga.frogilab.dev';
const ID = /^[0-9A-Z]{20,32}$/;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const buckets = new Map();

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
}

function json(res, status, body, origin) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) });
  res.end(JSON.stringify(body));
}

function text(res, status, body, origin, upstreamStatus) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    ...corsHeaders(origin),
    ...(upstreamStatus ? { 'x-upstream-status': String(upstreamStatus) } : {}),
  });
  res.end(body);
}

function rateLimited(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const state = buckets.get(key);
  if (!state || now - state.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  state.count += 1;
  return state.count > MAX_REQUESTS;
}

async function upstream(path, { referer, hxTarget } = {}) {
  const headers = {
    accept: 'text/html,application/xhtml+xml',
    'user-agent': 'Pachimanga-Gateway/0.1 (+https://pachimanga.frogilab.dev)',
  };
  if (referer) {
    headers.referer = referer;
    headers['hx-request'] = 'true';
    headers['hx-current-url'] = referer;
  }
  if (hxTarget) headers['hx-target'] = hxTarget;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${BASE}${path}`, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    const body = await response.text();
    return { status: response.status, ok: response.ok, body };
  } finally {
    clearTimeout(timer);
  }
}

function validId(value) {
  return ID.test(value || '');
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' }, origin);
  if (rateLimited(req)) return json(res, 429, { error: 'Rate limit exceeded' }, origin);

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname === '/health') {
      const probe = await upstream('/');
      return json(res, 200, {
        ok: true,
        gateway: 'pachimanga-weebcentral',
        upstreamStatus: probe.status,
        upstreamReachable: probe.status > 0 && probe.status < 500,
      }, origin);
    }

    if (url.pathname === '/search') {
      const query = (url.searchParams.get('q') || '')
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 100);
      if (!query) return json(res, 400, { error: 'Missing q' }, origin);
      const searchPage = `${BASE}/search?text=${encodeURIComponent(query)}`;
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
      const result = await upstream(`/search/data?${params.toString()}`, { referer: searchPage });
      if (!result.ok) return json(res, result.status, { error: `WeebCentral HTTP ${result.status}` }, origin);
      return text(res, 200, result.body, origin, result.status);
    }

    const seriesMatch = url.pathname.match(/^\/series\/([0-9A-Z]{20,32})$/);
    if (seriesMatch) {
      const id = seriesMatch[1];
      const result = await upstream(`/series/${id}`);
      if (!result.ok) return json(res, result.status, { error: `WeebCentral HTTP ${result.status}` }, origin);
      return text(res, 200, result.body, origin, result.status);
    }

    const chaptersMatch = url.pathname.match(/^\/series\/([0-9A-Z]{20,32})\/chapters$/);
    if (chaptersMatch) {
      const id = chaptersMatch[1];
      if (!validId(id)) return json(res, 400, { error: 'Invalid series id' }, origin);
      const referer = `${BASE}/series/${id}`;
      const result = await upstream(`/series/${id}/full-chapter-list`, { referer, hxTarget: 'chapter-list' });
      if (!result.ok) return json(res, result.status, { error: `WeebCentral HTTP ${result.status}` }, origin);
      return text(res, 200, result.body, origin, result.status);
    }

    const chapterMatch = url.pathname.match(/^\/chapter\/([0-9A-Z]{20,32})$/);
    if (chapterMatch) {
      const id = chapterMatch[1];
      const result = await upstream(`/chapters/${id}`);
      if (!result.ok) return json(res, result.status, { error: `WeebCentral HTTP ${result.status}` }, origin);
      return text(res, 200, result.body, origin, result.status);
    }

    const pagesMatch = url.pathname.match(/^\/chapter\/([0-9A-Z]{20,32})\/pages$/);
    if (pagesMatch) {
      const id = pagesMatch[1];
      if (!validId(id)) return json(res, 400, { error: 'Invalid chapter id' }, origin);
      const referer = `${BASE}/chapters/${id}`;
      const result = await upstream(`/chapters/${id}/images?is_prev=False&reading_style=long_strip&current_page=1`, {
        referer,
        hxTarget: 'chapter-images',
      });
      if (!result.ok) return json(res, result.status, { error: `WeebCentral HTTP ${result.status}` }, origin);
      return text(res, 200, result.body, origin, result.status);
    }

    return json(res, 404, { error: 'Not found' }, origin);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'WeebCentral request timed out'
      : 'Gateway request failed';
    return json(res, 502, { error: message }, origin);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pachimanga WeebCentral gateway listening on ${PORT}`);
});
