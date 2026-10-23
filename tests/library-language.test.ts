import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { libraryTitleLanguage } from '../src/lib/library/manga-language.ts';

test('titles loaded from the cloud get their language from the provider', () => {
  // Cloud rows become placeholder manga without a language field.
  assert.equal(libraryTitleLanguage({ sourceId: 'weebcentral', manga: {} }), 'en');
  assert.equal(libraryTitleLanguage({ sourceId: 'zonatmo', manga: {} }), 'es');
  assert.equal(libraryTitleLanguage({ sourceId: 'zonatmo', manga: null }), 'es');
});

test('an explicit title language wins; unknown providers stay unknown', () => {
  assert.equal(libraryTitleLanguage({ sourceId: 'weebcentral', manga: { language: 'ja' } }), 'ja');
  assert.equal(libraryTitleLanguage({ sourceId: 'import', manga: {} }), null);
});

test('the Library never starts filtered by the Browse language preference', () => {
  const library = readFileSync(join(process.cwd(), 'src/features/library/library-view.tsx'), 'utf8');
  assert.match(library, /useState<MangaLanguage \| "all">\("all"\)/);
  assert.doesNotMatch(library, /contentLanguage/);
});
