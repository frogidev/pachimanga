export const LIBRARY_READING_STATUSES = [
  'reading',
  'completed',
  'on_hold',
  'dropped',
  'plan_to_read',
] as const;

export type LibraryReadingStatus = (typeof LIBRARY_READING_STATUSES)[number];

export type LibraryProgressLike = {
  chapterId: string;
  percentage: number;
};

export type LibraryChapterLike = {
  id: string;
  chapterNumber: number;
  title?: string;
  publishedAt?: string;
};

export type PreviousSourceSnapshot = {
  addedAt: string;
  chapterCount?: number | null;
  latestChapterId?: string | null;
  latestChapterNumber?: number | null;
  newChapterCount?: number | null;
  lastChapterChangeAt?: string | null;
};

export function normalizeLibraryReadingStatus(value: unknown): LibraryReadingStatus {
  return LIBRARY_READING_STATUSES.includes(value as LibraryReadingStatus)
    ? (value as LibraryReadingStatus)
    : 'plan_to_read';
}

function clampPercentage(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

export function summarizeLibraryProgress(
  chapterCount: number,
  progressRows: LibraryProgressLike[],
  fallbackProgress = 0,
) {
  const total = Math.max(0, Math.floor(Number(chapterCount) || 0));
  const byChapter = new Map<string, number>();
  for (const row of progressRows) {
    if (!row.chapterId) continue;
    byChapter.set(row.chapterId, clampPercentage(row.percentage));
  }

  const percentages = [...byChapter.values()];
  if (!total || percentages.length === 0) {
    const percentage = clampPercentage(fallbackProgress);
    return {
      percentage,
      completedChapters: percentage >= 99 ? (total || 1) : 0,
      chapterCount: total,
      fullyRead: percentage >= 99,
    };
  }

  const completedChapters = percentages.filter((value) => value >= 99).length;
  const sum = percentages.reduce((totalPercentage, value) => totalPercentage + value, 0);
  const percentage = Math.max(0, Math.min(100, sum / total));

  return {
    percentage,
    completedChapters,
    chapterCount: total,
    fullyRead: completedChapters >= total,
  };
}

export function automaticLibraryReadingStatus(summary: {
  percentage: number;
  fullyRead: boolean;
}): LibraryReadingStatus {
  if (summary.fullyRead) return 'completed';
  if (summary.percentage > 0) return 'reading';
  return 'plan_to_read';
}

function timestamp(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function latestLibraryChapter(chapters: LibraryChapterLike[]) {
  let latest: LibraryChapterLike | null = null;
  for (const chapter of chapters) {
    if (!latest) {
      latest = chapter;
      continue;
    }
    const chapterNumber = Number.isFinite(chapter.chapterNumber) ? chapter.chapterNumber : 0;
    const latestNumber = Number.isFinite(latest.chapterNumber) ? latest.chapterNumber : 0;
    if (chapterNumber > latestNumber) {
      latest = chapter;
      continue;
    }
    if (chapterNumber === latestNumber && timestamp(chapter.publishedAt) > timestamp(latest.publishedAt)) {
      latest = chapter;
    }
  }
  return latest;
}

export function nextLibrarySourceSnapshot(
  previous: PreviousSourceSnapshot,
  chapters: LibraryChapterLike[],
  observedAt: string,
) {
  const latest = latestLibraryChapter(chapters);
  const previousCount = Math.max(0, Math.floor(Number(previous.chapterCount) || 0));
  const nextCount = chapters.length;
  const baseline = previousCount === 0 && !previous.latestChapterId;
  const latestNumber = latest && Number.isFinite(latest.chapterNumber) ? latest.chapterNumber : null;
  const previousNumber = Number(previous.latestChapterNumber);
  const numberAdvanced = latestNumber != null && Number.isFinite(previousNumber) && latestNumber > previousNumber;
  const latestChanged = Boolean(previous.latestChapterId && latest?.id && previous.latestChapterId !== latest.id);
  const countDelta = baseline ? 0 : Math.max(0, nextCount - previousCount);
  const newDelta = countDelta || (!baseline && latestChanged && numberAdvanced ? 1 : 0);
  const changed = newDelta > 0;
  const publishedAt = latest?.publishedAt && Number.isFinite(Date.parse(latest.publishedAt)) ? latest.publishedAt : null;

  return {
    chapterCount: nextCount,
    latestChapterId: latest?.id ?? null,
    latestChapterNumber: latestNumber,
    latestChapterPublishedAt: publishedAt,
    newChapterCount: Math.max(0, Number(previous.newChapterCount) || 0) + newDelta,
    lastChapterChangeAt: baseline
      ? publishedAt || previous.lastChapterChangeAt || previous.addedAt
      : changed
        ? publishedAt || observedAt
        : previous.lastChapterChangeAt || publishedAt || previous.addedAt,
    lastCheckedAt: observedAt,
  };
}

export function shouldRefreshLibrarySource(lastCheckedAt: string | null | undefined, now = Date.now(), maxAgeMs = 30 * 60 * 1000) {
  const checkedAt = timestamp(lastCheckedAt);
  return checkedAt === Number.NEGATIVE_INFINITY || now - checkedAt >= maxAgeMs;
}
