import assert from 'node:assert/strict';
import test from 'node:test';
import { collectPagedRows } from '../src/lib/storage/paged-query.ts';

test('collectPagedRows returns every row across multiple API pages', async () => {
  const source = Array.from({ length: 2505 }, (_, index) => ({ id: index }));
  const calls: Array<[number, number]> = [];

  const rows = await collectPagedRows(async (from, to) => {
    calls.push([from, to]);
    return { data: source.slice(from, to + 1), error: null };
  }, { pageSize: 1000, maxPages: 5 });

  assert.equal(rows.length, 2505);
  assert.deepEqual(rows[0], { id: 0 });
  assert.deepEqual(rows.at(-1), { id: 2504 });
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test('collectPagedRows fails instead of returning a partial snapshot', async () => {
  await assert.rejects(
    collectPagedRows(async (from) => {
      if (from >= 1000) return { data: null, error: new Error('network failure') };
      return { data: Array.from({ length: 1000 }, (_, index) => index), error: null };
    }),
    /network failure/,
  );
});

test('collectPagedRows enforces a bounded row safety limit', async () => {
  await assert.rejects(
    collectPagedRows(async (from, to) => ({
      data: Array.from({ length: to - from + 1 }, (_, index) => from + index),
      error: null,
    }), { pageSize: 2, maxPages: 2 }),
    /4 row safety limit/,
  );
});
