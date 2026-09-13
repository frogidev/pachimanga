import type { Chapter, Manga, Page } from "@/types/models";

export interface MangaSource {
  readonly id: string;
  readonly name: string;

  search(query: string): Promise<Manga[]>;
  getManga(id: string): Promise<Manga>;
  getChapters(mangaId: string): Promise<Chapter[]>;
  getChapterPages(chapterId: string): Promise<Page[]>;
}

export class SourceUnavailableError extends Error {
  constructor(sourceName: string, detail?: string) {
    super(`${sourceName} is unavailable${detail ? `: ${detail}` : "."}`);
    this.name = "SourceUnavailableError";
  }
}
