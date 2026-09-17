const BASE_URL = (process.env.BASE_URL || 'https://pachimanga.frogilab.dev').replace(/\/$/, '');

const protectedPaths = [
  '/',
  '/library',
  '/browse',
  '/import',
  '/history',
  '/settings',
  '/manga/invalid-id',
  '/reader/invalid-id',
  '/api/source/weebcentral/status',
];

const requiredIcons = [
  { src: '/icons/icon-192.png', sizes: '192x192' },
  { src: '/icons/icon-512.png', sizes: '512x512' },
  { src: '/icons/icon-512-maskable.png', sizes: '512x512', purpose: 'maskable' },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'PachimangaProductionSmoke/1.0',
      ...options.headers,
    },
    ...options,
  });
}

async function checkProtectedPath(path) {
  const response = await request(path);
  const location = response.headers.get('location') || '';
  const cacheControl = response.headers.get('cache-control') || '';

  assert(response.status >= 300 && response.status < 400, `${path}: expected auth redirect, got ${response.status}`);
  assert(location.startsWith('/auth') || location.startsWith(`${BASE_URL}/auth`), `${path}: expected /auth redirect, got ${location || '(none)'}`);
  assert(/private/i.test(cacheControl) && /no-store/i.test(cacheControl), `${path}: expected private, no-store cache policy, got ${cacheControl || '(none)'}`);
}

async function checkPublicPath(path, expectedText) {
  const response = await request(path, { redirect: 'follow' });
  assert(response.ok, `${path}: expected 2xx, got ${response.status}`);
  const text = await response.text();
  if (expectedText) assert(text.toLowerCase().includes(expectedText.toLowerCase()), `${path}: missing expected content: ${expectedText}`);
  return { response, text };
}

async function checkImage(path) {
  const response = await request(path, { redirect: 'follow' });
  assert(response.ok, `${path}: expected 2xx, got ${response.status}`);
  assert((response.headers.get('content-type') || '').startsWith('image/'), `${path}: expected image content type`);
}

async function checkManifest() {
  const response = await request('/manifest.webmanifest', { redirect: 'follow' });
  assert(response.ok, `/manifest.webmanifest: expected 2xx, got ${response.status}`);
  const manifest = await response.json();

  assert(manifest.id === '/', `/manifest.webmanifest: unexpected id ${manifest.id}`);
  assert(manifest.name === 'Pachimanga', `/manifest.webmanifest: unexpected name ${manifest.name}`);
  assert(manifest.short_name === 'Pachimanga', `/manifest.webmanifest: unexpected short_name ${manifest.short_name}`);
  assert(manifest.start_url === '/', `/manifest.webmanifest: unexpected start_url ${manifest.start_url}`);
  assert(manifest.scope === '/', `/manifest.webmanifest: unexpected scope ${manifest.scope}`);
  assert(manifest.display === 'standalone', `/manifest.webmanifest: unexpected display ${manifest.display}`);
  assert(manifest.theme_color === '#140d16', `/manifest.webmanifest: unexpected theme_color ${manifest.theme_color}`);
  assert(manifest.background_color === '#0d0a11', `/manifest.webmanifest: unexpected background_color ${manifest.background_color}`);

  for (const expected of requiredIcons) {
    const icon = manifest.icons?.find((candidate) => candidate.src === expected.src);
    assert(icon, `/manifest.webmanifest: missing ${expected.src}`);
    assert(icon.sizes === expected.sizes, `/manifest.webmanifest: ${expected.src} has unexpected sizes ${icon.sizes}`);
    if (expected.purpose) assert(icon.purpose === expected.purpose, `/manifest.webmanifest: ${expected.src} missing ${expected.purpose} purpose`);
    await checkImage(expected.src);
  }

  await checkImage('/apple-touch-icon.png');
}

async function checkServiceWorker() {
  const { response, text } = await checkPublicPath('/sw.js', 'CACHE_VERSION');
  assert((response.headers.get('content-type') || '').includes('javascript'), '/sw.js: expected JavaScript content type');
  assert(text.includes('request.mode === "navigate"'), '/sw.js: expected navigation handling');
  assert(text.includes('url.pathname.startsWith("/api/")'), '/sw.js: expected API exclusion');
  assert(text.includes('cache.match("/offline")') || text.includes('caches.match("/offline")'), '/sw.js: expected offline navigation fallback');
  assert(text.includes('RUNTIME_CACHE_LIMIT'), '/sw.js: expected bounded runtime cache');
  assert(text.includes('CHAPTER_CACHE'), '/sw.js: expected explicit chapter cache boundary');
}

async function main() {
  for (const path of protectedPaths) await checkProtectedPath(path);

  await checkPublicPath('/auth', 'Sign in to Pachimanga');
  await checkPublicPath('/offline', 'offline');
  await checkManifest();
  await checkServiceWorker();

  console.log(`Production smoke passed for ${BASE_URL}`);
  console.log(`Protected routes checked: ${protectedPaths.length}`);
  console.log(`PWA icons checked: ${requiredIcons.length + 1}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
