import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildComicKSearchPath,
  buildMangaDexFeedPath,
} from '../src/sources/core/provider-request-paths.ts';

test('ComicK search uses the current trailing-slash endpoint without a page parameter', () => {
  const path = buildComicKSearchPath('One Piece');
  assert.match(path, /^\/v1\.0\/search\/\?/);
  const query = new URL(`https://example.test${path}`).searchParams;
  assert.equal(query.get('q'), 'One Piece');
  assert.equal(query.get('limit'), '24');
  assert.equal(query.has('page'), false);
});

test('MangaDex feed excludes external-only chapters that have no at-home pages', () => {
  const path = buildMangaDexFeedPath('abc', 0, 100);
  const query = new URL(`https://example.test${path}`).searchParams;
  assert.equal(query.get('includeExternalUrl'), '0');
  assert.deepEqual(query.getAll('translatedLanguage[]'), ['en']);
  assert.deepEqual(query.getAll('contentRating[]'), ['safe', 'suggestive']);
});
