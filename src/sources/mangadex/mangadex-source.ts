import type { Chapter, Manga, MangaStatus, Page } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import { collectSourcePages } from '@/sources/core/pagination';
import { buildMangaDexFeedPath } from '@/sources/core/provider-request-paths';
import { fetchWithSourceRetry } from '@/sources/core/source-fetch';

const API = 'https://api.mangadex.org';
const SITE = 'https://mangadex.org';
const COVERS = 'https://uploads.mangadex.org/covers';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Localized = Record<string, string>;
type Relationship = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};
type MangaDexManga = {
  id: string;
  type: 'manga';
  attributes: {
    title: Localized;
    altTitles?: Localized[];
    description?: Localized;
    status?: string;
    tags?: Array<{ attributes?: { name?: Localized } }>;
  };
  relationships?: Relationship[];
};
type MangaDexChapter = {
  id: string;
  type: 'chapter';
  attributes: {
    title?: string | null;
    chapter?: string | null;
    volume?: string | null;
    publishAt?: string;
  };
};

function rawMangaId(value: string) {
  const id = value.replace(/^md-/, '');
  if (!UUID.test(id)) throw new Error('Invalid MangaDex manga identifier.');
  return id;
}

function rawChapterId(value: string) {
  const id = value.replace(/^mdc-/, '');
  if (!UUID.test(id)) throw new Error('Invalid MangaDex chapter identifier.');
  return id;
}

function localized(value?: Localized) {
  if (!value) return '';
  return value.en || value['en-us'] || value.ja || Object.values(value)[0] || '';
}

function mangaStatus(value?: string): MangaStatus {
  if (value === 'ongoing') return 'ongoing';
  if (value === 'completed') return 'complete';
  if (value === 'hiatus') return 'hiatus';
  if (value === 'cancelled') return 'cancelled';
  return 'unknown';
}

function relation(resource: MangaDexManga, type: string) {
  return resource.relationships?.find((item) => item.type === type);
}

function relationName(resource: MangaDexManga, type: string) {
  const rel = relation(resource, type);
  const value = rel?.attributes?.name;
  return typeof value === 'string' ? value : '';
}

function coverUrl(resource: MangaDexManga) {
  const rel = relation(resource, 'cover_art');
  const fileName = rel?.attributes?.fileName;
  if (typeof fileName !== 'string' || !fileName) return '/icons/icon-512.png';
  return `${COVERS}/${resource.id}/${encodeURIComponent(fileName)}.512.jpg`;
}

function toManga(resource: MangaDexManga): Manga {
  const title = localized(resource.attributes.title) || 'Untitled';
  const alternativeTitles = (resource.attributes.altTitles || [])
    .map((item) => localized(item))
    .filter((item, index, all) => item && item !== title && all.indexOf(item) === index);
  const genres = (resource.attributes.tags || [])
    .map((tag) => localized(tag.attributes?.name))
    .filter(Boolean);

  return {
    id: `md-${resource.id}`,
    sourceId: 'mangadex',
    title,
    alternativeTitles,
    description: localized(resource.attributes.description),
    coverUrl: coverUrl(resource),
    author: relationName(resource, 'author'),
    artist: relationName(resource, 'artist'),
    status: mangaStatus(resource.attributes.status),
    genres,
    sourceUrl: `${SITE}/title/${resource.id}`,
  };
}

async function mdFetch<T>(path: string, revalidate = 300): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchWithSourceRetry(`${API}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Pachimanga/0.4 (+https://pachimanga.frogilab.dev)',
      },
      signal: controller.signal,
      next: { revalidate },
    });

    if (response.status === 429) {
      throw new SourceUnavailableError('MangaDex', 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('MangaDex', `HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('MangaDex', 'request timed out');
    }
    throw new SourceUnavailableError('MangaDex', 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

export class MangaDexSource implements MangaSource {
  readonly id = 'mangadex';
  readonly name = 'MangaDex';

  async search(query: string): Promise<Manga[]> {
    const q = query.trim().slice(0, 100);
    if (!q) return [];

    const params = new URLSearchParams({ title: q, limit: '24', hasAvailableChapters: 'true' });
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    params.append('availableTranslatedLanguage[]', 'en');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('order[relevance]', 'desc');

    const payload = await mdFetch<{ data?: MangaDexManga[] }>(`/manga?${params.toString()}`, 120);
    return (payload.data || []).map(toManga);
  }

  async getManga(id: string): Promise<Manga> {
    const rid = rawMangaId(id);
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    const payload = await mdFetch<{ data: MangaDexManga }>(`/manga/${rid}?${params.toString()}`, 300);
    return toManga(payload.data);
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const rid = rawMangaId(mangaId);
    const all = await collectSourcePages<MangaDexChapter>(
      async (_page, offset, limit) => {
        const payload = await mdFetch<{ data?: MangaDexChapter[]; total?: number }>(
          buildMangaDexFeedPath(rid, offset, limit),
          120,
        );
        return { items: payload.data || [], total: payload.total };
      },
      { pageSize: 100, maxPages: 5 },
    );

    const seen = new Set<string>();
    const chapters: Chapter[] = [];

    for (const item of all) {
      const chapterText = item.attributes.chapter || '';
      const volumeText = item.attributes.volume || '';
      const dedupeKey = `${volumeText}:${chapterText || item.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const chapterNumber = Number(chapterText || 0);
      const volumeNumber = volumeText ? Number(volumeText) : undefined;
      chapters.push({
        id: `mdc-${item.id}`,
        mangaId: `md-${rid}`,
        sourceId: 'mangadex',
        title: item.attributes.title?.trim() || (chapterText ? `Chapter ${chapterText}` : 'Oneshot'),
        chapterNumber: Number.isFinite(chapterNumber) ? chapterNumber : 0,
        volumeNumber: volumeNumber != null && Number.isFinite(volumeNumber) ? volumeNumber : undefined,
        publishedAt: item.attributes.publishAt,
        sourceUrl: `${SITE}/chapter/${item.id}`,
      });
    }

    return chapters;
  }

  async getChapterPages(chapterId: string): Promise<Page[]> {
    const rid = rawChapterId(chapterId);
    const payload = await mdFetch<{
      baseUrl: string;
      chapter: { hash: string; data?: string[]; dataSaver?: string[] };
    }>(`/at-home/server/${rid}`, 60);

    const files = payload.chapter.data?.length ? payload.chapter.data : payload.chapter.dataSaver || [];
    const quality = payload.chapter.data?.length ? 'data' : 'data-saver';
    if (!files.length) throw new SourceUnavailableError('MangaDex', 'no readable page images were found');
    return files.map((fileName, index) => ({
      index,
      imageUrl: `${payload.baseUrl}/${quality}/${payload.chapter.hash}/${fileName}`,
    }));
  }
}

export const mangaDexSource = new MangaDexSource();

export async function getMangaDexChapterContext(chapterId: string) {
  const rid = rawChapterId(chapterId);
  const chapterPayload = await mdFetch<{
    data: MangaDexChapter & { relationships?: Relationship[] };
  }>(`/chapter/${rid}`, 300);
  const mangaRel = chapterPayload.data.relationships?.find((item) => item.type === 'manga');
  if (!mangaRel?.id) {
    throw new SourceUnavailableError('MangaDex', 'chapter manga could not be resolved');
  }

  const mangaId = `md-${mangaRel.id}`;
  const [manga, chapters, pages] = await Promise.all([
    mangaDexSource.getManga(mangaId),
    mangaDexSource.getChapters(mangaId),
    mangaDexSource.getChapterPages(`mdc-${rid}`),
  ]);
  const chapter = chapters.find((item) => item.id === `mdc-${rid}`) || {
    id: `mdc-${rid}`,
    mangaId,
    sourceId: 'mangadex',
    title: chapterPayload.data.attributes.title?.trim() || 'Chapter',
    chapterNumber: Number(chapterPayload.data.attributes.chapter || 0) || 0,
    publishedAt: chapterPayload.data.attributes.publishAt,
    sourceUrl: `${SITE}/chapter/${rid}`,
  };

  return { manga, chapter, chapters, pages };
}
