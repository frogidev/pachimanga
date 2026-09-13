import type { Chapter, Manga, Page } from "@/types/models";

const baseManga = [
  {
    id: "ashen-sky",
    title: "Ashen Sky",
    author: "Mina Kuroda",
    artist: "Mina Kuroda",
    genres: ["Action", "Fantasy", "Drama"],
    status: "ongoing" as const,
    accent: "violet",
  },
  {
    id: "glass-horizon",
    title: "Glass Horizon",
    author: "H. Ren",
    artist: "Seo Ijin",
    genres: ["Sci-fi", "Mystery", "Drama"],
    status: "ongoing" as const,
    accent: "cyan",
  },
  {
    id: "second-moon",
    title: "The Second Moon",
    author: "Ari Han",
    artist: "Yuna Park",
    genres: ["Fantasy", "Romance", "Adventure"],
    status: "ongoing" as const,
    accent: "rose",
  },
  {
    id: "quiet-swordsman",
    title: "The Quiet Swordsman",
    author: "Daichi Sato",
    artist: "Ken Mori",
    genres: ["Martial Arts", "Action"],
    status: "complete" as const,
    accent: "amber",
  },
  {
    id: "signal-zero",
    title: "Signal Zero",
    author: "N. Vale",
    artist: "N. Vale",
    genres: ["Thriller", "Sci-fi"],
    status: "ongoing" as const,
    accent: "lime",
  },
  {
    id: "winter-orchid",
    title: "Winter Orchid",
    author: "Li Xue",
    artist: "Mei Lin",
    genres: ["Historical", "Drama", "Romance"],
    status: "complete" as const,
    accent: "blue",
  },
  {
    id: "city-of-embers",
    title: "City of Embers",
    author: "Jun Seo",
    artist: "Min K",
    genres: ["Action", "Supernatural"],
    status: "ongoing" as const,
    accent: "orange",
  },
  {
    id: "paper-stars",
    title: "Paper Stars",
    author: "Ena Cho",
    artist: "Ena Cho",
    genres: ["Slice of Life", "Comedy"],
    status: "hiatus" as const,
    accent: "pink",
  },
];

export const MOCK_MANGA: Manga[] = baseManga.map((item) => ({
  id: item.id,
  sourceId: "mock",
  title: item.title,
  alternativeTitles: [],
  description: `${item.title} is mock catalog content created for the Pachimanga offline demo. It exercises the library, details, chapter navigation, persistence, and reader without depending on an external manga provider.`,
  coverUrl: `/mock/covers/${item.id}.svg`,
  author: item.author,
  artist: item.artist,
  status: item.status,
  genres: item.genres,
  sourceUrl: `mock://${item.id}`,
}));

const chapterCounts: Record<string, number> = {
  "ashen-sky": 18,
  "glass-horizon": 12,
  "second-moon": 27,
  "quiet-swordsman": 42,
  "signal-zero": 9,
  "winter-orchid": 33,
  "city-of-embers": 21,
  "paper-stars": 7,
};

export const MOCK_CHAPTERS: Chapter[] = MOCK_MANGA.flatMap((manga) => {
  const total = chapterCounts[manga.id] ?? 12;
  return Array.from({ length: total }, (_, index) => {
    const chapterNumber = total - index;
    return {
      id: `${manga.id}-ch-${chapterNumber}`,
      mangaId: manga.id,
      sourceId: "mock",
      title: `Chapter ${chapterNumber}`,
      chapterNumber,
      sourceUrl: `mock://${manga.id}/chapter/${chapterNumber}`,
      publishedAt: new Date(Date.UTC(2026, 7, Math.max(1, 28 - index))).toISOString(),
    } satisfies Chapter;
  });
});

const pageHeights = [1640, 1820, 1480, 2100, 1760, 1920, 1600, 2240, 1700, 1880, 2050, 1540];

export function getMockManga(id: string): Manga | undefined {
  return MOCK_MANGA.find((manga) => manga.id === id);
}

export function getMockChapters(mangaId: string): Chapter[] {
  return MOCK_CHAPTERS.filter((chapter) => chapter.mangaId === mangaId);
}

export function getMockChapter(chapterId: string): Chapter | undefined {
  return MOCK_CHAPTERS.find((chapter) => chapter.id === chapterId);
}

export function getMockPages(chapterId: string): Page[] {
  const chapter = getMockChapter(chapterId);
  if (!chapter) return [];

  const offset = Math.abs(chapter.chapterNumber) % pageHeights.length;
  return pageHeights.map((_, index) => {
    const pageNumber = ((index + offset) % pageHeights.length) + 1;
    return {
      index,
      imageUrl: `/mock/pages/page-${String(pageNumber).padStart(2, "0")}.svg`,
      width: 1200,
      height: pageHeights[pageNumber - 1],
    } satisfies Page;
  });
}
