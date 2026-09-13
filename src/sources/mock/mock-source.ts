import {
  MOCK_MANGA,
  getMockChapters,
  getMockManga,
  getMockPages,
} from "@/lib/mock-data";
import type { MangaSource } from "@/sources/core/manga-source";

export class MockMangaSource implements MangaSource {
  readonly id = "mock";
  readonly name = "Mock Catalog";

  async search(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return MOCK_MANGA;
    return MOCK_MANGA.filter((manga) =>
      [manga.title, manga.author, manga.genres.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }

  async getManga(id: string) {
    const manga = getMockManga(id);
    if (!manga) throw new Error(`Mock manga not found: ${id}`);
    return manga;
  }

  async getChapters(mangaId: string) {
    return getMockChapters(mangaId);
  }

  async getChapterPages(chapterId: string) {
    return getMockPages(chapterId);
  }
}

export const mockSource = new MockMangaSource();
