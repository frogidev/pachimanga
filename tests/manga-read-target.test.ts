import assert from 'node:assert/strict';
import test from 'node:test';
import { allReadableChaptersComplete, firstReadableChapter, latestReadableChapter, nextUnreadReadableChapter } from '../src/features/manga/read-target.ts';
import type { Chapter } from '../src/types/models.ts';

function chapter(id: string, chapterNumber: number, title = `Episode ${chapterNumber}`): Chapter {
  return {
    id,
    mangaId: 'manga-1',
    sourceId: 'weebcentral',
    title,
    chapterNumber,
    sourceUrl: `https://example.test/${id}`,
  };
}

test('new readers start from the lowest numbered chapter even when providers return newest first', () => {
  const chapters = [chapter('c122', 122), chapter('c2', 2), chapter('c1', 1)];

  assert.equal(firstReadableChapter(chapters)?.id, 'c1');
  assert.equal(latestReadableChapter(chapters)?.id, 'c122');
});

test('chapter target selection does not depend on provider array ordering', () => {
  const chapters = [chapter('c7', 7), chapter('c1', 1), chapter('c12', 12), chapter('c3', 3)];

  assert.equal(firstReadableChapter(chapters)?.id, 'c1');
  assert.equal(latestReadableChapter(chapters)?.id, 'c12');
});

test('unnumbered provider lists fall back to oldest-last/newest-first ordering', () => {
  const chapters = [
    chapter('newest', 0, 'Newest special'),
    chapter('middle', 0, 'Middle special'),
    chapter('oldest', 0, 'Oldest special'),
  ];

  assert.equal(firstReadableChapter(chapters)?.id, 'oldest');
  assert.equal(latestReadableChapter(chapters)?.id, 'newest');
});

test('empty chapter lists have no reading target', () => {
  assert.equal(firstReadableChapter([]), null);
  assert.equal(latestReadableChapter([]), null);
});


test('next unread target advances to newly available chapters instead of restarting at chapter one', () => {
  const chapters = [chapter('c4', 4), chapter('c3', 3), chapter('c2', 2), chapter('c1', 1)];
  const progress = { c1: 100, c2: 100, c3: 100 };

  assert.equal(nextUnreadReadableChapter(chapters, progress)?.id, 'c4');
  assert.equal(allReadableChaptersComplete(chapters, progress), false);
});

test('fully read manga have no unread target and remain caught up', () => {
  const chapters = [chapter('c3', 3), chapter('c2', 2), chapter('c1', 1)];
  const progress = { c1: 100, c2: 100, c3: 100 };

  assert.equal(nextUnreadReadableChapter(chapters, progress), null);
  assert.equal(allReadableChaptersComplete(chapters, progress), true);
});
