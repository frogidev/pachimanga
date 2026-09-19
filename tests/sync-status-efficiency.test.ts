import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(join(ROOT, path), 'utf8');
}

const idb = source('src/lib/storage/idb.ts');
const syncStatus = source('src/components/sync-status.tsx');

test('sync queue status counts records without hydrating outbox payloads', () => {
  assert.match(idb, /export async function idbCount/);
  assert.match(idb, /tx\.objectStore\(store\)\.count\(\)/);
  assert.match(syncStatus, /idbCount\('libraryOutbox'\)/);
  assert.match(syncStatus, /idbCount\('outbox'\)/);
  assert.match(syncStatus, /idbCount\('settingsOutbox'\)/);
  assert.doesNotMatch(syncStatus, /idbGetAll/);
});

test('sync completion accounting includes every owner-bound queue', () => {
  assert.match(syncStatus, /const pending = next\.pendingLibrary \+ next\.pendingProgress \+ next\.pendingSettings/);
  assert.match(syncStatus, /No pending library, reading-progress or settings changes\./);
});

test('sync status components share one visibility-aware observer', () => {
  assert.match(syncStatus, /useSyncExternalStore\(subscribeSyncSnapshot, getSyncSnapshot, getServerSyncSnapshot\)/);
  assert.match(syncStatus, /snapshotListeners\.size === 1/);
  assert.equal((syncStatus.match(/setInterval\(/g) || []).length, 1);
  assert.match(syncStatus, /document\.visibilityState === 'visible'/);
  assert.match(syncStatus, /visibilitychange/);
});
