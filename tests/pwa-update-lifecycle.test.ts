import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SW = new URL('../public/sw.js', import.meta.url);
const REGISTER = new URL('../src/components/pwa-register.tsx', import.meta.url);

test('service worker waits for explicit user activation on upgrades', async () => {
  const source = await readFile(SW, 'utf8');
  const installBody = source.match(/addEventListener\("install"[\s\S]*?\n\}\);/)?.[0] || '';

  assert.doesNotMatch(installBody, /skipWaiting\(/);
  assert.match(source, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(source, /self\.skipWaiting\(\)/);
});

test('service worker keeps authenticated navigation network-first and APIs uncached', async () => {
  const source = await readFile(SW, 'utf8');

  assert.match(source, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /fetch\(request\)\.catch\(\(\) => caches\.open\(SHELL_CACHE\)/);
  assert.doesNotMatch(source, /PUBLIC_SHELL[\s\S]*?"\/"/);
});

test('service worker separates the public shell and bounds runtime cache growth', async () => {
  const source = await readFile(SW, 'utf8');

  assert.match(source, /const SHELL_CACHE/);
  assert.match(source, /const RUNTIME_CACHE/);
  assert.match(source, /const RUNTIME_CACHE_LIMIT = 250/);
  assert.match(source, /trimRuntimeCache\(cache\)/);
  assert.match(source, /!ACTIVE_CACHES\.has\(key\)/);
});

test('PWA registration exposes an explicit update-and-reload action', async () => {
  const source = await readFile(REGISTER, 'utf8');

  assert.match(source, /registration\.waiting/);
  assert.match(source, /postMessage\(\{ type: "SKIP_WAITING" \}\)/);
  assert.match(source, /controllerchange/);
  assert.match(source, /window\.location\.reload\(\)/);
});
