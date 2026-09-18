import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeProviderSearchResults } from '../src/lib/source/search-dedupe.ts';
import type { Manga } from '../src/types/models.ts';

function manga(sourceId: string, id: string, title: string, alternativeTitles: string[] = []): Manga {
  return {
    sourceId,
    id,
    title,
    alternativeTitles,
    description: '',
    coverUrl: '',
    author: '',
    artist: '',
    status: 'unknown',
    genres: [],
    sourceUrl: '',
  };
}

test('provider search dedupe keeps preferred source order and removes title duplicates', () => {
  const weeb = manga('weebcentral', 'wc-a', 'Solo Leveling');
  const mangadexDuplicate = manga('mangadex', 'md-a', 'Solo-Leveling');
  const unique = manga('mangadex', 'md-b', 'Other Story');

  const out = mergeProviderSearchResults([[weeb], [mangadexDuplicate, unique]]);
  assert.deepEqual(out.map((item) => item.id), ['wc-a', 'md-b']);
});

test('provider search dedupe also uses alternative titles', () => {
  const preferred = manga('weebcentral', 'wc-a', 'Omniscient Reader', ['Omniscient Reader’s Viewpoint']);
  const duplicate = manga('mangadex', 'md-a', 'Omniscient Readers Viewpoint');
  const out = mergeProviderSearchResults([[preferred], [duplicate]]);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.id, 'wc-a');
});
