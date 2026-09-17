import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const cacheSource = await readFile(new URL('../src/lib/offline/chapter-cache.ts', import.meta.url), 'utf8');
const authSource = await readFile(new URL('../src/components/AuthForm.tsx', import.meta.url), 'utf8');

test('explicit chapter cache survives shell updates and serves cross-origin manga images', () => {
  assert.match(sw, /CHAPTER_CACHE\s*=\s*"pachimanga-chapters-v1"/);
  assert.match(sw, /ACTIVE_CACHES\s*=\s*new Set\(\[SHELL_CACHE, RUNTIME_CACHE, CHAPTER_CACHE\]\)/);
  assert.match(sw, /request\.destination === "image" && !sameOrigin/);
  assert.match(sw, /caches\.open\(CHAPTER_CACHE\)/);
  assert.match(sw, /cached \|\| fetch\(request\)/);
});

test('downloaded chapter cache is rebound on account changes', () => {
  assert.match(cacheSource, /CHAPTER_CACHE_OWNER_KEY/);
  assert.match(cacheSource, /current === userId/);
  assert.match(cacheSource, /caches\.delete\(CHAPTER_CACHE\)/);
  assert.match(cacheSource, /localStorage\.setItem\(CHAPTER_CACHE_OWNER_KEY, userId\)/);
});

test('sign out clears downloaded chapter pages', () => {
  assert.match(authSource, /clearChapterCache/);
  assert.match(authSource, /Promise\.all\(\[clearLocalUserCache\(\), clearChapterCache\(\)\]\)/);
});
