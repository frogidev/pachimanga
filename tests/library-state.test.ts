import assert from 'node:assert/strict';
import test from 'node:test';
import {
  automaticLibraryReadingStatus,
  nextLibrarySourceSnapshot,
  shouldRefreshLibrarySource,
  summarizeLibraryProgress,
} from '../src/lib/library/library-state.ts';

test('library progress includes partial chapter progress and completes only when every chapter is complete', () => {
  const partial = summarizeLibraryProgress(4, [
    { chapterId: 'a', percentage: 100 },
    { chapterId: 'b', percentage: 100 },
    { chapterId: 'c', percentage: 50 },
  ]);
  assert.equal(partial.percentage, 62.5);
  assert.equal(partial.fullyRead, false);
  assert.equal(automaticLibraryReadingStatus(partial), 'reading');

  const complete = summarizeLibraryProgress(4, [
    { chapterId: 'a', percentage: 100 },
    { chapterId: 'b', percentage: 100 },
    { chapterId: 'c', percentage: 100 },
    { chapterId: 'd', percentage: 100 },
  ]);
  assert.equal(complete.percentage, 100);
  assert.equal(complete.fullyRead, true);
  assert.equal(automaticLibraryReadingStatus(complete), 'completed');
});

test('legacy completed summaries remain completed until detailed chapter progress exists', () => {
  const beforeBaseline = summarizeLibraryProgress(0, [], 100);
  assert.equal(beforeBaseline.percentage, 100);
  assert.equal(automaticLibraryReadingStatus(beforeBaseline), 'completed');

  const afterBaseline = summarizeLibraryProgress(147, [], 100);
  assert.equal(afterBaseline.percentage, 100);
  assert.equal(afterBaseline.fullyRead, true);
  assert.equal(automaticLibraryReadingStatus(afterBaseline), 'completed');

  const detailed = summarizeLibraryProgress(147, [{ chapterId: '147', percentage: 50 }], 100);
  assert.ok(detailed.percentage < 1);
  assert.equal(detailed.fullyRead, false);
  assert.equal(automaticLibraryReadingStatus(detailed), 'reading');
});

test('initial provider snapshot establishes a baseline without flagging every existing chapter as new', () => {
  const snapshot = nextLibrarySourceSnapshot(
    { addedAt: '2026-01-01T00:00:00.000Z' },
    [
      { id: 'c2', chapterNumber: 2, publishedAt: '2026-02-02T00:00:00.000Z' },
      { id: 'c1', chapterNumber: 1, publishedAt: '2026-02-01T00:00:00.000Z' },
    ],
    '2026-03-01T00:00:00.000Z',
  );
  assert.equal(snapshot.latestChapterId, 'c2');
  assert.equal(snapshot.chapterCount, 2);
  assert.equal(snapshot.newChapterCount, 0);
  assert.equal(snapshot.lastChapterChangeAt, '2026-02-02T00:00:00.000Z');
});

test('later provider snapshots count newly observed chapters once', () => {
  const snapshot = nextLibrarySourceSnapshot(
    {
      addedAt: '2026-01-01T00:00:00.000Z',
      chapterCount: 2,
      latestChapterId: 'c2',
      latestChapterNumber: 2,
      newChapterCount: 1,
      lastChapterChangeAt: '2026-02-02T00:00:00.000Z',
    },
    [
      { id: 'c3', chapterNumber: 3, publishedAt: '2026-03-03T00:00:00.000Z' },
      { id: 'c2', chapterNumber: 2 },
      { id: 'c1', chapterNumber: 1 },
    ],
    '2026-03-04T00:00:00.000Z',
  );
  assert.equal(snapshot.newChapterCount, 2);
  assert.equal(snapshot.lastChapterChangeAt, '2026-03-03T00:00:00.000Z');
});

test('source refresh becomes stale after the configured interval', () => {
  const checked = '2026-09-16T12:00:00.000Z';
  assert.equal(shouldRefreshLibrarySource(checked, Date.parse('2026-09-16T12:29:00.000Z')), false);
  assert.equal(shouldRefreshLibrarySource(checked, Date.parse('2026-09-16T12:31:00.000Z')), true);
  assert.equal(shouldRefreshLibrarySource(null, Date.now()), true);
});
