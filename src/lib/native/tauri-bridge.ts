import type { Chapter, Manga, Page } from '@/types/models';
import {
  parseChapterSeriesId,
  parseChapterTitle,
  parseChaptersHtml,
  parseMangaHtml,
  parsePagesHtml,
  parseSearchHtml,
} from '@/sources/weebcentral/parser';

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: Invoke;
      };
    };
  }
}

const ID = /^[0-9A-Z]{20,32}$/;

type NativeOperation = 'health' | 'search' | 'manga' | 'chapters' | 'chapter' | 'pages';

function getInvoke(): Invoke | null {
  if (typeof window === 'undefined') return null;
  return window.__TAURI__?.core?.invoke ?? null;
}

export function isTauriNative() {
  return Boolean(getInvoke());
}

export function nativeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      // Fall through to String below.
    }
  }
  return String(error || 'Native WeebCentral unavailable');
}

function rawId(value: string, prefixes: string[]) {
  let id = value;
  for (const prefix of prefixes) {
    if (id.startsWith(prefix)) id = id.slice(prefix.length);
  }
  if (!ID.test(id)) throw new Error('Invalid WeebCentral identifier.');
  return id;
}

async function nativeRequest(operation: NativeOperation, input: { query?: string; id?: string } = {}) {
  const invoke = getInvoke();
  if (!invoke) throw new Error('Native Pachimanga bridge is unavailable.');
  return invoke<string>('weebcentral_request', {
    operation,
    query: input.query ?? null,
    id: input.id ?? null,
  });
}

export async function probeNativeWeebCentral(): Promise<{ ok: boolean; error?: string }> {
  const invoke = getInvoke();
  if (!invoke) return { ok: false, error: 'Native Pachimanga bridge is unavailable.' };
  try {
    await nativeRequest('health');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: nativeErrorMessage(error) };
  }
}

export async function nativeWeebCentralHealth() {
  return (await probeNativeWeebCentral()).ok;
}

export async function searchNativeWeebCentral(query: string): Promise<Manga[]> {
  const normalized = query
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  if (!normalized) return [];
  return parseSearchHtml(await nativeRequest('search', { query: normalized }));
}

export async function getNativeWeebCentralManga(id: string): Promise<Manga> {
  const rid = rawId(id, ['wc-']);
  return parseMangaHtml(await nativeRequest('manga', { id: rid }), rid);
}

export async function getNativeWeebCentralChapters(mangaId: string): Promise<Chapter[]> {
  const rid = rawId(mangaId, ['wc-']);
  return parseChaptersHtml(await nativeRequest('chapters', { id: rid }), rid);
}

export async function getNativeWeebCentralChapterContext(chapterId: string): Promise<{
  manga: Manga;
  chapter: Chapter;
  chapters: Chapter[];
  pages: Page[];
}> {
  const rid = rawId(chapterId, ['wc-']);
  const chapterHtml = await nativeRequest('chapter', { id: rid });
  const mangaRaw = parseChapterSeriesId(chapterHtml);
  if (!mangaRaw) throw new Error('WeebCentral chapter series could not be resolved.');

  const [mangaHtml, chaptersHtml, pagesHtml] = await Promise.all([
    nativeRequest('manga', { id: mangaRaw }),
    nativeRequest('chapters', { id: mangaRaw }),
    nativeRequest('pages', { id: rid }),
  ]);

  const manga = parseMangaHtml(mangaHtml, mangaRaw);
  const chapters = parseChaptersHtml(chaptersHtml, mangaRaw);
  const pages = parsePagesHtml(pagesHtml);
  if (!pages.length) throw new Error('WeebCentral returned no readable page images.');

  const chapter = chapters.find((item) => item.id === `wc-${rid}`) ?? {
    id: `wc-${rid}`,
    mangaId: manga.id,
    sourceId: 'weebcentral',
    title: parseChapterTitle(chapterHtml),
    chapterNumber: 0,
    sourceUrl: `https://weebcentral.com/chapters/${rid}`,
  };

  return { manga, chapter, chapters, pages };
}
