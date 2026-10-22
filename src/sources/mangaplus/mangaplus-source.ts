import type { Chapter, Manga, MangaStatus, Page } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';

const API = 'https://jumpg-webapi.tokyo-cdn.com/api';
const SITE = 'https://mangaplus.shueisha.co.jp';

interface MangaPlusTitle {
  id: number;
  title: string;
  author: string;
  summary: string;
  status: string;
  genres: string[];
  thumbnail: string;
  viewUrl: string;
  languages: string[];
}

interface MangaPlusChapter {
  id: number;
  title: string;
  chapterNumber: number;
  volume: number;
  publishedAt: string;
  viewUrl: string;
}

interface MangaPlusPage {
  page: number;
  url: string;
}

function mangaStatus(value: string): MangaStatus {
  switch (value.toLowerCase()) {
    case 'ongoing': return 'ongoing';
    case 'completed': return 'complete';
    case 'hiatus': return 'hiatus';
    case 'cancelled': return 'cancelled';
    default: return 'unknown';
  }
}

function toManga(item: MangaPlusTitle): Manga {
  return {
    id: `mp-${item.id}`,
    sourceId: 'mangaplus',
    title: item.title,
    alternativeTitles: [],
    description: item.summary,
    coverUrl: item.thumbnail,
    author: item.author,
    artist: '',
    status: mangaStatus(item.status),
    genres: item.genres,
    sourceUrl: `${SITE}${item.viewUrl}`,
  };
}

async function mpFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Pachimanga/1.0.2 (+https://pachimanga.frogilab.dev)',
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new SourceUnavailableError('MangaPlus', 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('MangaPlus', `HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('MangaPlus', 'request timed out');
    }
    throw new SourceUnavailableError('MangaPlus', 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

export class MangaPlusSource implements MangaSource {
  readonly id = 'mangaplus';
  readonly name = 'MangaPlus';

  async search(query: string): Promise<Manga[]> {
    const q = query.trim().slice(0, 100);
    if (!q) return [];

    const payload = await mpFetch<{ success: boolean; titles: MangaPlusTitle[] }>(
      `/title_list?format=json`
    );

    if (!payload.success) return [];

    const filtered = payload.titles.filter((t) =>
      t.title.toLowerCase().includes(q.toLowerCase()) &&
      t.languages.includes('ES')
    );

    return filtered.slice(0, 24).map(toManga);
  }

  async getManga(id: string): Promise<Manga> {
    const mpId = id.replace('mp-', '');
    const payload = await mpFetch<{ success: boolean; title: MangaPlusTitle }>(
      `/title_detail?title_id=${mpId}&format=json`
    );

    if (!payload.success || !payload.title) {
      throw new SourceUnavailableError('MangaPlus', 'Manga not found');
    }

    return toManga(payload.title);
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const mpId = mangaId.replace('mp-', '');
    const payload = await mpFetch<{ success: boolean; chapters: MangaPlusChapter[] }>(
      `/title_detail?title_id=${mpId}&format=json`
    );

    if (!payload.success) return [];

    return payload.chapters
      .filter((c) => c.chapterNumber > 0)
      .map((c) => ({
        id: `mpc-${c.id}`,
        mangaId: `mp-${mpId}`,
        sourceId: 'mangaplus',
        title: c.title || `Chapter ${c.chapterNumber}`,
        chapterNumber: c.chapterNumber,
        volumeNumber: c.volume || undefined,
        publishedAt: c.publishedAt,
        sourceUrl: `${SITE}${c.viewUrl}`,
      }))
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  async getChapterPages(chapterId: string): Promise<Page[]> {
    const mpId = chapterId.replace('mpc-', '');
    const payload = await mpFetch<{ success: boolean; pages: MangaPlusPage[] }>(
      `/viewer?chapter_id=${mpId}&format=json&split=no&lang=es`
    );

    if (!payload.success || !payload.pages?.length) {
      throw new SourceUnavailableError('MangaPlus', 'no readable page images were found');
    }

    return payload.pages.map((p, index) => ({
      index,
      imageUrl: p.url,
    }));
  }
}

export const mangaPlusSource = new MangaPlusSource();