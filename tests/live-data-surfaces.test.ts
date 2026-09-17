import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(join(ROOT, path), 'utf8');
}

const updatesPage = source('src/app/updates/page.tsx');
const updatesView = source('src/features/updates/updates-view.tsx');
const availabilityRoute = source('src/app/api/library/availability/route.ts');
const historyView = source('src/features/history/history-view.tsx');
const browseView = source('src/features/browse/browse-view.tsx');
const libraryView = source('src/features/library/library-view.tsx');

test('updates renders live account/provider availability instead of a static empty screen', () => {
  assert.match(updatesPage, /<UpdatesView\s*\/>/);
  assert.match(updatesView, /\/api\/library\/availability/);
  assert.match(updatesView, /\/api\/library\/refresh/);
  assert.match(updatesView, /shouldRefreshLibrarySource/);
  assert.match(updatesView, /Check all now/);
  assert.match(updatesView, /Library availability/);
  assert.match(updatesView, /Live Supabase account state/);
  assert.doesNotMatch(updatesView, /getLibraryDashboardEntries/);
  assert.doesNotMatch(updatesView, /Nothing new yet/);
  assert.doesNotMatch(updatesView, /empty-shelves\.avif/);
});

test('live availability endpoint remains signed-in, owner-scoped and private', () => {
  assert.match(availabilityRoute, /sb\.auth\.getUser\(\)/);
  assert.match(availabilityRoute, /\.eq\('user_id', user\.id\)/);
  assert.match(availabilityRoute, /Cache-Control': 'private, no-store'/);
  assert.match(availabilityRoute, /library_entries/);
  assert.doesNotMatch(availabilityRoute, /service_role|SERVICE_ROLE/);
});

test('history distinguishes loading, failure, confirmed zero and real metadata', () => {
  assert.match(historyView, /const \[loading, setLoading\]/);
  assert.match(historyView, /Retry history load/);
  assert.match(historyView, /0 reading events are stored for this account/);
  assert.match(historyView, /Metadata unavailable/);
  assert.doesNotMatch(historyView, /MockCoverArt/);
  assert.doesNotMatch(historyView, /Saved manga/);
  assert.doesNotMatch(historyView, /Your reading trail starts here/);
  assert.doesNotMatch(historyView, /empty-shelves\.avif/);
});

test('browse reports live search lifecycle without a promotional empty card', () => {
  assert.match(browseView, /type SearchState = "idle" \| "searching" \| "done" \| "error"/);
  assert.match(browseView, /Searching live sources/);
  assert.match(browseView, /0 readable titles returned/);
  assert.match(browseView, /Retry live search/);
  assert.doesNotMatch(browseView, /Search to build your library/);
  assert.doesNotMatch(browseView, /No matching readable manga/);
});

test('library shows confirmed account/filter counts without decorative empty artwork', () => {
  assert.match(libraryView, /0 titles are stored in this account/);
  assert.match(libraryView, /0 titles match the current library filters/);
  assert.doesNotMatch(libraryView, /Your library is empty/);
  assert.doesNotMatch(libraryView, /empty-shelves\.avif/);
});
