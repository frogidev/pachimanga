import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const settings = source('src/app/settings/page.tsx');
const library = source('src/features/library/library-view.tsx');
const browse = source('src/features/browse/browse-view.tsx');
const card = source('src/components/manga-card.tsx');
const detail = source('src/features/manga/manga-detail.tsx');
const storage = source('src/lib/storage/reader-storage.ts');

test('mobile settings keeps theme switching reachable without the desktop sidebar', () => {
  assert.match(settings, /ThemeQuickToggle/);
  assert.match(settings, /md:hidden/);
  assert.match(settings, /Appearance/);
});

test('library compact mode renders a real row variant and card status editing is not in the list menu', () => {
  assert.match(library, /variant={view === "compact" \? "compact" : "grid"}/);
  assert.match(library, /view === "compact"[\s\S]*grid-cols-1 gap-2/);
  assert.doesNotMatch(card, /onStatusChange|statusOptions|My status/);
  assert.match(card, /variant\?: "grid" \| "compact"/);
  assert.match(card, /h-24 w-16/);
});

test('Browse only labels exact signed-in library entries as in-library', () => {
  assert.match(browse, /getLibraryEntries/);
  assert.match(browse, /libraryByKey/);
  assert.match(browse, /inLibrary={Boolean\(libraryEntry\)}/);
  assert.match(card, /inLibrary \? \(/);
  assert.match(card, /membershipLabel/);
});

test('manga detail owns reading status and hydrates complete synced per-title progress', () => {
  assert.match(detail, /setLibraryReadingStatus/);
  assert.match(detail, /My reading status/);
  assert.match(detail, /getMangaProgress\(manga\.id\)/);
  assert.match(detail, /legacyLastChapter/);
  assert.match(storage, /export async function getMangaProgress/);
  assert.match(storage, /\.eq\('manga_id', mangaId\)/);
  assert.match(storage, /idbPut\('progress'/);
});


test('mobile library layout control sits next to the content it changes and persists immediately', () => {
  const libraryHeading = library.indexOf('Your Library');
  const mobileLayout = library.indexOf('aria-label="Library layout"', libraryHeading);
  const cards = library.indexOf('variant={view === "compact" ? "compact" : "grid"}');
  assert.ok(libraryHeading >= 0);
  assert.ok(mobileLayout > libraryHeading);
  assert.ok(cards > mobileLayout);
  assert.match(library, /md:hidden[\s\S]*> Grid[\s\S]*> List/);
  assert.match(library, /function changeView\(next: ViewMode\)[\s\S]*setView\(next\)[\s\S]*localStorage\.setItem\(LIBRARY_VIEW_KEY, next\)/);
  assert.match(library, /hidden[\s\S]*md:flex[\s\S]*aria-label="Library layout"/);
});
