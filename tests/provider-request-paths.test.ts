import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildComicKSearchPath,
  buildMangaDexFeedPath,
} from '../src/sources/core/provider-request-paths.ts';

test('ComicK search uses the current non-trailing-slash API endpoint', () => {
  const path = buildComicKSearchPath('One Piece');
  assert.match(path, /^\/v1\.0\/search\?/);
  assert.doesNotMatch(path, /\/search\/\?/);
  assert.match(path, /q=One\+Piece/);
});

test('MangaDex feed excludes external-only chapters that have no at-home pages', () => {
  const path = buildMangaDexFeedPath('abc', 0, 100);
  const query = new URL(`https://example.test${path}`).searchParams;
  assert.equal(query.get('includeExternalUrl'), '0');
  assert.deepEqual(query.getAll('translatedLanguage[]'), ['en']);
  assert.deepEqual(query.getAll('contentRating[]'), ['safe', 'suggestive']);
});
