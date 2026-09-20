import type { LibraryReadingStatus } from '@/lib/library/library-state';

export type MangaStatus = "ongoing" | "complete" | "hiatus" | "cancelled" | "unknown";

export interface Manga {
  id: string;
  sourceId: string;
  title: string;
  alternativeTitles: string[];
  description: string;
  coverUrl: string;
  author: string;
  artist: string;
  status: MangaStatus;
  genres: string[];
  sourceUrl: string;
}

export interface Chapter {
  id: string;
  mangaId: string;
  sourceId: string;
  title: string;
  chapterNumber: number;
  volumeNumber?: number;
  publishedAt?: string;
  sourceUrl: string;
}

export interface Page {
  index: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface ReadingProgress {
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  scrollPosition: number;
  percentage: number;
  updatedAt: string;
}

export interface LibraryEntry {
  mangaId: string;
  sourceId: string;
  addedAt: string;
  manga?: Manga;
  lastReadAt?: string;
  progress?: number;
  lastChapterRead?: number;
  lastPageRead?: number;
  readingStatus?: LibraryReadingStatus;
  readingStatusManual?: boolean;
  publicationStatus?: MangaStatus;
  chapterCount?: number;
  latestChapterId?: string;
  latestChapterNumber?: number;
  latestChapterPublishedAt?: string;
  newChapterCount?: number;
  lastChapterChangeAt?: string;
  lastCheckedAt?: string;
}

export interface ReadingHistoryEntry {
  mangaId: string;
  chapterId: string;
  readAt: string;
  percentage: number;
}

export interface ReaderSettings {
  autoScrollMultiplier: number;
  baseSpeedPxPerSecond: number;
  fitMode: "width" | "screen";
  theme: "dark" | "light";
  keepScreenAwake?: boolean;
  preloadPages?: 1 | 2 | 3 | 4;
  defaultPreset?: "manga" | "webtoon";
  titlePresets?: Record<string, "manga" | "webtoon">;
}
