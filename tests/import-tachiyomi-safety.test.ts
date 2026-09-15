import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { gunzipWithLimit } from '../src/lib/imports/tachiyomi.ts';

test('Tachiyomi gzip helper round-trips data within the safety limit', async (t) => {
  if (typeof DecompressionStream === 'undefined') {
    t.skip('DecompressionStream is unavailable in this Node runtime');
    return;
  }
  const source = new TextEncoder().encode('pachimanga backup fixture');
  const compressed = gzipSync(source);
  const result = await gunzipWithLimit(new Uint8Array(compressed), 1024);
  assert.equal(new TextDecoder().decode(result), 'pachimanga backup fixture');
});

test('Tachiyomi gzip helper stops expansion beyond the configured limit', async (t) => {
  if (typeof DecompressionStream === 'undefined') {
    t.skip('DecompressionStream is unavailable in this Node runtime');
    return;
  }
  const source = new TextEncoder().encode('x'.repeat(4096));
  const compressed = gzipSync(source);
  await assert.rejects(
    gunzipWithLimit(new Uint8Array(compressed), 1024),
    /expands beyond the 0 MiB safety limit|safety limit/,
  );
});
