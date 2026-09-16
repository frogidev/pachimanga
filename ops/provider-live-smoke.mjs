import { appendFileSync } from 'node:fs';

const USER_AGENT = 'Pachimanga-provider-smoke/1.0 (+https://pachimanga.frogilab.dev)';
const RELAY_BASE_URL = (process.env.RELAY_BASE_URL || 'https://wc-relay.frogilab.dev').replace(/\/+$/, '');
const RELAY_TOKEN = process.env.RELAY_TOKEN?.trim() || '';
const TIMEOUT_MS = 12_000;

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(4)} ${name}: ${detail}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        'User-Agent': USER_AGENT,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, label, init = {}) {
  const response = await request(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}`);
  }
  return response.json();
}

async function assertImageReachable(url, label) {
  const response = await request(url, {
    headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Range: 'bytes=0-0' },
  });
  try {
    assert(response.ok, `${label} image HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    assert(contentType.startsWith('image/'), `${label} unexpected image content-type ${contentType || '(missing)'}`);
  } finally {
    await response.body?.cancel().catch(() => {});
  }
}

async function findReadableMangaDexChapter(base, candidates) {
  for (const candidate of candidates.slice(0, 8)) {
    const response = await request(`${base}/at-home/server/${encodeURIComponent(candidate.id)}`, {
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) {
      await response.body?.cancel().catch(() => {});
      continue;
    }
    if (!response.ok) throw new Error(`MangaDex pages HTTP ${response.status}`);
    const atHome = await response.json();
    const files = atHome?.chapter?.data?.length ? atHome.chapter.data : atHome?.chapter?.dataSaver || [];
    if (atHome?.baseUrl && atHome?.chapter?.hash && files.length) {
      return { chapter: candidate, atHome, files };
    }
  }
  throw new Error('MangaDex returned no at-home-readable chapter in the first 8 filtered results');
}

async function smokeMangaDex() {
  const base = 'https://api.mangadex.org';
  const search = new URLSearchParams({ title: 'Berserk', limit: '8', hasAvailableChapters: 'true' });
  search.append('includes[]', 'cover_art');
  search.append('availableTranslatedLanguage[]', 'en');
  search.append('contentRating[]', 'safe');
  search.append('contentRating[]', 'suggestive');
  search.append('order[relevance]', 'desc');

  const searchPayload = await getJson(`${base}/manga?${search}`, 'MangaDex search');
  const manga = (searchPayload.data || []).find((item) => typeof item?.id === 'string');
  assert(manga, 'MangaDex search returned no usable title');

  const detail = await getJson(`${base}/manga/${encodeURIComponent(manga.id)}?includes%5B%5D=cover_art`, 'MangaDex detail');
  assert(detail?.data?.id === manga.id, 'MangaDex detail did not match search result');

  const feed = new URLSearchParams({ limit: '24', offset: '0', includeExternalUrl: '0' });
  feed.append('translatedLanguage[]', 'en');
  feed.append('order[chapter]', 'desc');
  feed.append('contentRating[]', 'safe');
  feed.append('contentRating[]', 'suggestive');
  const chapters = await getJson(`${base}/manga/${encodeURIComponent(manga.id)}/feed?${feed}`, 'MangaDex chapters');
  const candidates = (chapters.data || []).filter((item) => typeof item?.id === 'string');
  assert(candidates.length, 'MangaDex returned no filtered English chapters');
  assert(
    candidates.every((item) => !item?.attributes?.externalUrl),
    'MangaDex includeExternalUrl=0 returned an external-only chapter',
  );

  const { chapter, atHome, files } = await findReadableMangaDexChapter(base, candidates);
  const quality = atHome?.chapter?.data?.length ? 'data' : 'data-saver';
  await assertImageReachable(`${atHome.baseUrl}/${quality}/${atHome.chapter.hash}/${files[0]}`, 'MangaDex');

  const noResult = new URLSearchParams({ title: `pachimanga-no-result-${Date.now()}-zzzz`, limit: '1' });
  const none = await getJson(`${base}/manga?${noResult}`, 'MangaDex no-result');
  assert(Array.isArray(none.data) && none.data.length === 0, 'MangaDex no-result query unexpectedly returned data');

  return `search/detail/chapters/pages/image/no-result OK (${manga.id}, ${chapter.id})`;
}

async function smokeComicK() {
  const base = 'https://api.comick.dev';
  const search = await getJson(`${base}/v1.0/search/?q=One%20Piece&limit=8`, 'ComicK search');
  const items = Array.isArray(search) ? search : search?.data || [];
  const manga = items.find((item) => typeof item?.hid === 'string' && item.hid.length >= 4);
  assert(manga, 'ComicK search returned no usable title');

  const detail = await getJson(`${base}/comic/${encodeURIComponent(manga.hid)}/`, 'ComicK detail');
  const detailComic = detail?.comic || detail;
  assert(detailComic?.hid === manga.hid || detailComic?.hid, 'ComicK detail did not return a usable manga');

  const chaptersPayload = await getJson(
    `${base}/comic/${encodeURIComponent(manga.hid)}/chapters?page=1&limit=24&lang=en&chap-order=1`,
    'ComicK chapters',
  );
  const chapter = (chaptersPayload?.chapters || []).find((item) => typeof item?.hid === 'string');
  assert(chapter, 'ComicK returned no English chapter metadata');

  const chapterPayload = await getJson(`${base}/chapter/${encodeURIComponent(chapter.hid)}`, 'ComicK pages');
  const chapterDetail = chapterPayload?.chapter || chapterPayload;
  const image = (chapterDetail?.md_images || []).find((item) => typeof item?.b2key === 'string' && item.b2key);
  assert(image, 'ComicK exposes chapter metadata but no readable page images');
  await assertImageReachable(`https://meo.comick.pictures/${image.b2key}`, 'ComicK');

  const nonePayload = await getJson(
    `${base}/v1.0/search/?q=${encodeURIComponent(`pachimanga-no-result-${Date.now()}-zzzz`)}&limit=1`,
    'ComicK no-result',
  );
  const none = Array.isArray(nonePayload) ? nonePayload : nonePayload?.data || [];
  assert(none.length === 0, 'ComicK no-result query unexpectedly returned data');

  return `search/detail/chapters/pages/image/no-result OK (${manga.hid}, ${chapter.hid})`;
}

async function smokeRelayPublicHealth() {
  const response = await request(`${RELAY_BASE_URL}/health`, { headers: { Accept: 'application/json,text/plain;q=0.9' } });
  const body = await response.text();
  assert(response.ok, `relay public health HTTP ${response.status}`);
  assert(body.trim().length > 0, 'relay public health returned an empty body');
  return `HTTP ${response.status}`;
}

async function smokeRelayAuthenticatedHealth() {
  if (!RELAY_TOKEN) return null;
  const payload = await getJson(`${RELAY_BASE_URL}/health/upstream`, 'relay authenticated upstream health', {
    headers: { Authorization: `Bearer ${RELAY_TOKEN}` },
  });
  assert(payload?.ok === true, `relay upstream health not OK${payload?.error ? `: ${payload.error}` : ''}`);
  return 'authenticated upstream health OK';
}

async function run(name, fn, { optional = false } = {}) {
  try {
    const detail = await fn();
    if (detail == null && optional) {
      record(name, 'SKIP', 'required secret is not configured in this workflow');
      return;
    }
    record(name, 'PASS', String(detail));
  } catch (error) {
    record(name, 'FAIL', error instanceof Error ? error.message : String(error));
  }
}

await run('MangaDex live chain', smokeMangaDex);
await run('ComicK live chain', smokeComicK);
await run('WeebCentral relay public health', smokeRelayPublicHealth);
await run('WeebCentral relay upstream health', smokeRelayAuthenticatedHealth, { optional: true });

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map(({ name, status, detail }) => `| ${name} | ${status} | ${detail.replaceAll('|', '\\|')} |`).join('\n');
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Provider live smoke\n\n| Check | Result | Detail |\n| --- | --- | --- |\n${rows}\n`,
  );
}

const failures = results.filter((item) => item.status === 'FAIL');
if (failures.length) {
  process.exitCode = 1;
}
