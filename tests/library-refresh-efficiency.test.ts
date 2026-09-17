import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const refreshRoute = source('src/app/api/library/refresh/route.ts');
const refreshStatus = source('src/components/provider-refresh-status.tsx');
const weebCentral = source('src/sources/weebcentral/weebcentral-source.ts');

test('library refresh coalesces duplicate provider work and bounds request duration', () => {
  assert.match(refreshRoute, /RECENT_REFRESH_DEDUPE_MS\s*=\s*15_000/);
  assert.match(refreshRoute, /PROVIDER_REFRESH_TIMEOUT_MS\s*=\s*15_000/);
  assert.match(refreshRoute, /providerRefreshInFlight\s*=\s*new Map/);
  assert.match(refreshRoute, /if \(!force && checkedRecently\(row\.last_checked_at\)\)/);
  assert.match(refreshRoute, /Promise\.race\(/);
});

test('explicit per-title refresh bypasses the duplicate-refresh cooldown', () => {
  assert.match(refreshStatus, /JSON\.stringify\(\{ mangaId, force: true \}\)/);
});

test('WeebCentral chapter lists avoid the oversized Next data cache and reuse parsed results', () => {
  assert.match(weebCentral, /options\.operation === 'chapters'/);
  assert.match(weebCentral, /cache: 'no-store'/);
  assert.match(weebCentral, /CHAPTER_MEMORY_LIMIT\s*=\s*32/);
  assert.match(weebCentral, /CHAPTER_MEMORY_TTL_MS\s*=\s*2 \* 60 \* 1000/);
  assert.match(weebCentral, /chapterRequests\s*=\s*new Map/);
  assert.match(weebCentral, /getCachedChapters\(rid\)/);
});
