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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'PachimangaProductionSmoke/1.0',
      ...options.headers,
    },
    ...options,
  });
  return response;
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
  if (expectedText) assert(text.includes(expectedText), `${path}: missing expected content: ${expectedText}`);
}

async function main() {
  for (const path of protectedPaths) await checkProtectedPath(path);

  await checkPublicPath('/auth', 'Sign in to Pachimanga');
  await checkPublicPath('/offline', 'offline');

  const manifest = await request('/manifest.webmanifest', { redirect: 'follow' });
  assert(manifest.ok, `/manifest.webmanifest: expected 2xx, got ${manifest.status}`);
  const manifestJson = await manifest.json();
  assert(manifestJson.name === 'Pachimanga', `/manifest.webmanifest: unexpected name ${manifestJson.name}`);

  console.log(`Production smoke passed for ${BASE_URL}`);
  console.log(`Protected routes checked: ${protectedPaths.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
