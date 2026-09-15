import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJsonBackupText, parseJsonBackupValue } from '../src/lib/imports/json.ts';

test('JSON import accepts array and object library roots', () => {
  const direct = parseJsonBackupValue([{ title: 'A', progress: 3 }]);
  assert.equal(direct.manga[0]?.title, 'A');
  assert.equal(direct.manga[0]?.lastChapterRead, 3);

  const wrapped = parseJsonBackupValue({ library: [{ name: 'B', sourceUrl: 'https://example.test/b' }] });
  assert.equal(wrapped.manga[0]?.title, 'B');
  assert.equal(wrapped.manga[0]?.sourceUrl, 'https://example.test/b');
});

test('JSON import rejects malformed and unsupported roots', () => {
  assert.throws(() => parseJsonBackupText('{broken'), /not valid JSON/);
  assert.throws(() => parseJsonBackupValue({ items: [] }), /manga or library array/);
  assert.throws(() => parseJsonBackupValue('not an object'), /array or an object/);
});

test('JSON import skips invalid records and reports partial failures', () => {
  const result = parseJsonBackupValue([
    { title: 'Valid', lastChapterRead: '4.5', lastPageRead: 2 },
    { title: '' },
    17,
    { name: 'Also Valid', categories: ['Action', '', 5], totalChapters: 'bad' },
  ]);

  assert.deepEqual(result.manga.map((item) => item.title), ['Valid', 'Also Valid']);
  assert.equal(result.manga[0]?.lastChapterRead, 4.5);
  assert.deepEqual(result.manga[1]?.categories, ['Action']);
  assert.equal(result.manga[1]?.totalChapters, undefined);
  assert.ok(result.warnings.some((warning) => warning.includes('missing title/name')));
  assert.ok(result.warnings.some((warning) => warning.includes('expected an object')));
  assert.ok(result.warnings.some((warning) => warning.includes('invalid totalChapters')));
  assert.ok(result.warnings.some((warning) => warning.includes('ignored non-string/blank categories')));
});

test('JSON import rejects a non-empty file with no valid manga records', () => {
  assert.throws(
    () => parseJsonBackupValue([{ title: '' }, null, 42]),
    /no valid manga records/,
  );
});

test('JSON import deduplicates exact title/source pairs but keeps same title from different sources', () => {
  const result = parseJsonBackupValue([
    { title: 'Same', sourceUrl: 'https://one.test' },
    { name: ' same ', sourceUrl: 'https://one.test' },
    { title: 'Same', sourceUrl: 'https://two.test' },
  ]);
  assert.equal(result.manga.length, 2);
  assert.ok(result.warnings.some((warning) => warning.includes('Skipped duplicate')));
});

test('JSON import rejects invalid numeric progress without emitting NaN', () => {
  const result = parseJsonBackupValue([{ title: 'A', progress: 'wat', lastPageRead: -2 }]);
  assert.equal(result.manga[0]?.lastChapterRead, 0);
  assert.equal(result.manga[0]?.lastPageRead, 0);
  assert.equal(Number.isNaN(result.manga[0]?.lastChapterRead), false);
  assert.equal(Number.isNaN(result.manga[0]?.lastPageRead), false);
  assert.equal(result.warnings.length, 2);
});
