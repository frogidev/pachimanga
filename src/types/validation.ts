import type { Chapter, Manga, ReadingProgress } from "./models";

export function isManga(value: unknown): value is Manga {
  if (!value || typeof value !== "object") return false;
  const manga = value as Partial<Manga>;
  return (
    typeof manga.id === "string" &&
    typeof manga.sourceId === "string" &&
    typeof manga.title === "string" &&
    Array.isArray(manga.alternativeTitles) &&
    typeof manga.description === "string" &&
    typeof manga.coverUrl === "string" &&
    typeof manga.author === "string" &&
    typeof manga.artist === "string" &&
    Array.isArray(manga.genres)
  );
}

export function isChapter(value: unknown): value is Chapter {
  if (!value || typeof value !== "object") return false;
  const chapter = value as Partial<Chapter>;
  return (
    typeof chapter.id === "string" &&
    typeof chapter.mangaId === "string" &&
    typeof chapter.sourceId === "string" &&
    typeof chapter.title === "string" &&
    typeof chapter.chapterNumber === "number" &&
    Number.isFinite(chapter.chapterNumber)
  );
}

export function normalizeReadingProgress(progress: ReadingProgress): ReadingProgress {
  return {
    ...progress,
    pageIndex: Math.max(0, Math.floor(progress.pageIndex)),
    scrollPosition: Math.max(0, progress.scrollPosition),
    percentage: Math.min(100, Math.max(0, progress.percentage)),
  };
}
