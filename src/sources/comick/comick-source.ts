import type { Chapter, Manga, MangaStatus, Page } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import { collectSourcePages } from '@/sources/core/pagination';
import { buildComicKSearchPath } from '@/sources/core/provider-request-paths';
import { fetchWithSourceRetry } from '@/sources/core/source-fetch';

const API = 'https://api.comick.dev';
const SITE = 'https://comick.dev';
const IMAGES = 'https://meo.comick.pictures';
const HID = /^[A-Za-z0-9_-]{4,64}$/;

type ComickCover = { b2key?: string; w?: number; h?: number };
type ComickNamed = { name?: string } | string;
type ComickGenreRelation = { md_genres?: { name?: string } };
type ComickTitle = { title?: string; lang?: string };
type ComickComic = {
  hid?: string;
  slug?: string;
  title?: string;
  desc?: string;
  country?: string;
  status?: number | string;
  content_rating?: string;
  hentai?: boolean;
  last_chapter?: number | string | null;
  md_covers?: ComickCover[];
  md_titles?: ComickTitle[];
  md_comic_md_genres?: ComickGenreRelation[];
  author?: ComickNamed[];
  artist?: ComickNamed[];
  authors?: ComickNamed[];
  artists?: ComickNamed[];
};
type ComickDetail = {
  comic?: ComickComic;
  authors?: ComickNamed[];
  artists?: ComickNamed[];
  genres?: ComickNamed[];
};
type ComickChapter = {
  hid?: string;
  chap?: string | number | null;
  vol?: string | number | null;
  title?: string | null;
  lang?: string;
  created_at?: string;
  publish_at?: string;
  group_name?: string[];
};
type ComickImage = { b2key?: string; w?: number; h?: number };
type ComickChapterDetail = ComickChapter & {
  md_images?: ComickImage[];
  md_comics?: { hid?: string };
  comic?: { hid?: string };
};

function rawMangaId(value: string) {
  const id = value.replace(/^ck-/, '');
  if (!HID.test(id)) throw new Error('Invalid ComicK manga identifier.');
  return id;
}

function rawChapterId(value: string) {
  const id = value.replace(/^ckc-/, '');
  if (!HID.test(id)) throw new Error('Invalid ComicK chapter identifier.');
  return id;
}

function status(value?: number | string): MangaStatus {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === '1' || normalized === 'ongoing') return 'ongoing';
  if (normalized === '2' || normalized === 'completed' || normalized === 'complete') return 'complete';
  if (normalized === '3' || normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  if (normalized === '4' || normalized === 'hiatus') return 'hiatus';
  return 'unknown';
}

function names(items?: ComickNamed[]) {
  return (items || [])
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .filter(Boolean);
}

function coverUrl(resource: ComickComic) {
  const key = resource.md_covers?.[0]?.b2key;
  return key ? `${IMAGES}/${key}` : '/icons/icon-512.png';
}

function genres(resource: ComickComic, detail?: ComickDetail) {
  const topLevel = names(detail?.genres);
  if (topLevel.length) return topLevel;
  return (resource.md_comic_md_genres || [])
    .map((item) => item.md_genres?.name || '')
    .filter(Boolean);
}

function toManga(resource: ComickComic, detail?: ComickDetail): Manga {
  const hid = resource.hid || '';
  const title = resource.title?.trim() || 'Untitled';
  const alternativeTitles = (resource.md_titles || [])
    .map((item) => item.title?.trim() || '')
    .filter((item, index, all) => item && item !== title && all.indexOf(item) === index);
  const author = names(detail?.authors || resource.authors || resource.author)[0] || '';
  const artist = names(detail?.artists || resource.artists || resource.artist)[0] || '';

  return {
    id: `ck-${hid}`,
    sourceId: 'comick',
    title,
    alternativeTitles,
    description: resource.desc || '',
    coverUrl: coverUrl(resource),
    author,
    artist,
    status: status(resource.status),
    genres: genres(resource, detail),
    sourceUrl: `${SITE}/comic/${resource.slug || hid}`,
  };
}

function isReadableSearchHit(resource: ComickComic) {
  const rating = (resource.content_rating || '').toLowerCase();
  if (resource.hentai || rating === 'erotica' || rating === 'pornographic') return false;
  const lastChapter = Number(resource.last_chapter ?? 0);
  return Number.isFinite(lastChapter) ? lastChapter > 0 : Boolean(resource.last_chapter);
}

async function ckFetch<T>(path: string, revalidate = 300): Promise<T> {
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
      throw new SourceUnavailableError('ComicK', 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('ComicK', `HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('ComicK', 'request timed out');
    }
    throw new SourceUnavailableError('ComicK', 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

function mapChapter(resource: ComickChapter, mangaHid: string): Chapter | null {
  if (!resource.hid || !HID.test(resource.hid)) return null;
  const chapterText = resource.chap == null ? '' : String(resource.chap);
  const volumeText = resource.vol == null ? '' : String(resource.vol);
  const chapterNumber = Number(chapterText || 0);
  const volumeNumber = volumeText ? Number(volumeText) : undefined;
  return {
    id: `ckc-${resource.hid}`,
    mangaId: `ck-${mangaHid}`,
    sourceId: 'comick',
    title: resource.title?.trim() || (chapterText ? `Chapter ${chapterText}` : 'Oneshot'),
    chapterNumber: Number.isFinite(chapterNumber) ? chapterNumber : 0,
    volumeNumber: volumeNumber != null && Number.isFinite(volumeNumber) ? volumeNumber : undefined,
    publishedAt: resource.publish_at || resource.created_at,
    sourceUrl: `${SITE}/chapter/${resource.hid}`,
  };
}

function pagesFromChapter(resource?: ComickChapterDetail): Page[] {
  return (resource?.md_images || [])
    .filter((image) => Boolean(image.b2key))
    .map((image, index) => ({
      index,
      imageUrl: `${IMAGES}/${image.b2key}`,
      width: image.w,
      height: image.h,
    }));
}

export class ComickSource implements MangaSource {
  readonly id = 'comick';
  readonly name = 'ComicK';

  async search(query: string): Promise<Manga[]> {
    const q = query.trim().slice(0, 100);
    if (!q) return [];
    const payload = await ckFetch<ComickComic[] | { data?: ComickComic[] }>(buildComicKSearchPath(q), 120);
    const items = Array.isArray(payload) ? payload : payload.data || [];
    return items
      .filter((item) => Boolean(item.hid && HID.test(item.hid)))
      .filter(isReadableSearchHit)
      .map((item) => toManga(item));
  }

  async getManga(id: string): Promise<Manga> {
    const rid = rawMangaId(id);
    const payload = await ckFetch<ComickDetail | ComickComic>(`/comic/${encodeURIComponent(rid)}/`, 300);
    const detail = 'comic' in payload ? payload as ComickDetail : undefined;
    const comic = detail?.comic || payload as ComickComic;
    if (!comic.hid) comic.hid = rid;
    return toManga(comic, detail);
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const rid = rawMangaId(mangaId);
    const all = await collectSourcePages<ComickChapter>(
      async (page, _offset, limit) => {
        const params = new URLSearchParams({
          page: String(page + 1),
          limit: String(limit),
          lang: 'en',
          'chap-order': '1',
        });
        const payload = await ckFetch<{ chapters?: ComickChapter[]; total?: number }>(
          `/comic/${encodeURIComponent(rid)}/chapters?${params.toString()}`,
          120,
        );
        return { items: payload.chapters || [], total: payload.total };
      },
      { pageSize: 100, maxPages: 6 },
    );

    const seen = new Set<string>();
    const chapters: Chapter[] = [];
    for (const item of all) {
      const key = item.chap == null || item.chap === '' ? item.hid || '' : String(item.chap);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const chapter = mapChapter(item, rid);
      if (chapter) chapters.push(chapter);
    }
    return chapters;
  }

  async getChapterPages(chapterId: string): Promise<Page[]> {
    const rid = rawChapterId(chapterId);
    const payload = await ckFetch<{ chapter?: ComickChapterDetail } | ComickChapterDetail>(
      `/chapter/${encodeURIComponent(rid)}`,
      60,
    );
    const wrapped = payload as { chapter?: ComickChapterDetail };
    const chapter: ComickChapterDetail | undefined = wrapped.chapter ?? (payload as ComickChapterDetail);
    const pages = pagesFromChapter(chapter);
    if (!pages.length) throw new SourceUnavailableError('ComicK', 'no readable page images were found');
    return pages;
  }
}

export const comickSource = new ComickSource();

export async function getComickChapterContext(chapterId: string) {
  const rid = rawChapterId(chapterId);
  const payload = await ckFetch<{
    chapter?: ComickChapterDetail;
    comic?: { hid?: string };
  } & Partial<ComickChapterDetail>>(`/chapter/${encodeURIComponent(rid)}`, 60);
  const chapterRaw = (payload.chapter ?? payload) as ComickChapterDetail;
  const mangaHid = chapterRaw.md_comics?.hid || payload.comic?.hid || chapterRaw.comic?.hid;
  if (!mangaHid || !HID.test(mangaHid)) {
    throw new SourceUnavailableError('ComicK', 'chapter manga could not be resolved');
  }

  const mangaId = `ck-${mangaHid}`;
  const [manga, chapters] = await Promise.all([
    comickSource.getManga(mangaId),
    comickSource.getChapters(mangaId),
  ]);
  const pages = pagesFromChapter(chapterRaw);
  if (!pages.length) throw new SourceUnavailableError('ComicK', 'no readable page images were found');
  const chapter = chapters.find((item) => item.id === `ckc-${rid}`) || mapChapter(chapterRaw, mangaHid);
  if (!chapter) throw new SourceUnavailableError('ComicK', 'chapter metadata could not be resolved');
  return { manga, chapter, chapters, pages };
}
