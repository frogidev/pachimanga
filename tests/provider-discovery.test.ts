import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../src/app/api/source/search/route.ts', import.meta.url), 'utf8');

test('reader discovery does not fall back to metadata-only ComicK', () => {
  assert.match(route, /mangadex-source/);
  assert.match(route, /weebcentral-source/);
  assert.doesNotMatch(route, /comick-source/);
  assert.doesNotMatch(route, /source:\s*['"]ComicK['"]/);
});
