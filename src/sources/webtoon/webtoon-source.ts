import type { Chapter, Manga, MangaStatus, Page } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';

const API = 'https://www.webtoons.com/api';
const SITE = 'https://www.webtoons.com';

interface WebtoonSeries {
  seriesId: number;
  title: string;
  author: string;
  genre: string;
  summary: string;
  thumbnail: string;
  status: string;
  seriesLink: string;
  language: string;
}

interface WebtoonEpisode {
  episodeNo: number;
  title: string;
  thumbnail: string;
  createDate: string;
  serviceUrl: string;
}

interface WebtoonPage {
  imageUrl: string;
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

function toManga(item: WebtoonSeries): Manga {
  return {
    id: `wt-${item.seriesId}`,
    sourceId: 'webtoon',
    title: item.title,
    alternativeTitles: [],
    description: item.summary,
    coverUrl: item.thumbnail,
    author: item.author,
    artist: '',
    status: mangaStatus(item.status),
    genres: item.genre ? [item.genre] : [],
    sourceUrl: `${SITE}${item.seriesLink}`,
  };
}

async function wtFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Pachimanga/1.0.2 (+https://pachimanga.frogilab.dev)',
        Referer: SITE,
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new SourceUnavailableError('Webtoon', 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('Webtoon', `HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('Webtoon', 'request timed out');
    }
    throw new SourceUnavailableError('Webtoon', 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

export class WebtoonSource implements MangaSource {
  readonly id = 'webtoon';
  readonly name = 'Webtoon';

  async search(query: string): Promise<Manga[]> {
    const q = query.trim().slice(0, 100);
    if (!q) return [];

    const payload = await wtFetch<{ data: { seriesList: WebtoonSeries[] } }>(
      '/search/series',
      { keyword: q, language: 'es', page: '1', size: '24' }
    );

    return (payload.data?.seriesList || []).map(toManga);
  }

  async getManga(id: string): Promise<Manga> {
    const wtId = id.replace('wt-', '');
    const payload = await wtFetch<{ data: { series: WebtoonSeries } }>(
      '/series/detail',
      { seriesId: wtId, language: 'es' }
    );

    if (!payload.data?.series) {
      throw new SourceUnavailableError('Webtoon', 'Manga not found');
    }

    return toManga(payload.data.series);
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const wtId = mangaId.replace('wt-', '');
    const payload = await wtFetch<{ data: { episodes: WebtoonEpisode[] } }>(
      '/series/episodes',
      { seriesId: wtId, language: 'es', page: '1', size: '1000' }
    );

    return (payload.data?.episodes || [])
      .filter((e) => e.episodeNo > 0)
      .map((e) => ({
        id: `wte-${e.episodeNo}`,
        mangaId: `wt-${wtId}`,
        sourceId: 'webtoon',
        title: e.title || `Episode ${e.episodeNo}`,
        chapterNumber: e.episodeNo,
        publishedAt: e.createDate,
        sourceUrl: `${SITE}${e.serviceUrl}`,
      }))
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  async getChapterPages(chapterId: string): Promise<Page[]> {
    const epNo = chapterId.replace('wte-', '');
    const wtId = chapterId.split('-')[1]?.replace('wte', '');
    
    const payload = await wtFetch<{ data: { pages: WebtoonPage[] } }>(
      '/episode/viewer',
      { episodeNo: epNo, seriesId: wtId || '', language: 'es' }
    );

    if (!payload.data?.pages?.length) {
      throw new SourceUnavailableError('Webtoon', 'no readable page images were found');
    }

    return payload.data.pages.map((p, index) => ({
      index,
      imageUrl: p.imageUrl,
    }));
  }
}

export const webtoonSource = new WebtoonSource();