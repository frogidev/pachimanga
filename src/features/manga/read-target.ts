import type { Chapter } from '../../types/models';

function positiveChapterNumber(chapter: Chapter) {
  const value = Number(chapter.chapterNumber);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function firstReadableChapter(chapters: Chapter[]): Chapter | null {
  if (!chapters.length) return null;

  let first: Chapter | null = null;
  let firstNumber = Number.POSITIVE_INFINITY;
  for (const chapter of chapters) {
    const number = positiveChapterNumber(chapter);
    if (number == null || number >= firstNumber) continue;
    first = chapter;
    firstNumber = number;
  }

  // Provider lists are normally newest-first. If numbering is unavailable,
  // the final item is the safest representation of the beginning of the list.
  return first ?? chapters[chapters.length - 1] ?? null;
}

export function latestReadableChapter(chapters: Chapter[]): Chapter | null {
  if (!chapters.length) return null;

  let latest: Chapter | null = null;
  let latestNumber = Number.NEGATIVE_INFINITY;
  for (const chapter of chapters) {
    const number = positiveChapterNumber(chapter);
    if (number == null || number <= latestNumber) continue;
    latest = chapter;
    latestNumber = number;
  }

  return latest ?? chapters[0] ?? null;
}

export function nextUnreadReadableChapter(
  chapters: Chapter[],
  progressByChapter: Record<string, number>,
): Chapter | null {
  const unread = chapters.filter((chapter) => Number(progressByChapter[chapter.id] ?? 0) < 99);
  return firstReadableChapter(unread);
}

export function allReadableChaptersComplete(
  chapters: Chapter[],
  progressByChapter: Record<string, number>,
) {
  return chapters.length > 0 && chapters.every((chapter) => Number(progressByChapter[chapter.id] ?? 0) >= 99);
}
