import type { Chapter, Manga } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import { fetchWithSourceRetry } from '@/sources/core/source-fetch';
import {
  parseChaptersHtml,
  parseMangaHtml,
  parseReaderHtml,
  parseSearchHtml,
  ZONATMO_BASE,
} from './parser';

const NAME = 'ZonaTMO';
const ID = /^\d{1,9}$/;
const PAGE_TTL_MS = 2 * 60 * 1000;
const PAGE_CACHE_LIMIT = 16;

// Series pages list every chapter (~1 MB), so share one in-flight/short-lived fetch per series
// between getManga and getChapters instead of using the oversized Next data cache.
const seriesPages = new Map<string, { expiresAt: number; html: Promise<string> }>();

function rawId(value: string, prefix: 'zt-' | 'ztc-') {
  const id = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  if (!ID.test(id)) throw new Error('Invalid ZonaTMO identifier.');
  return id;
}

async function zonaFetch(path: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchWithSourceRetry(`${ZONATMO_BASE}${path}`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Pachimanga/1.0.2 (+https://pachimanga.frogilab.dev)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (response.headers.get('cf-mitigated') === 'challenge' || response.status === 403 || response.status === 503) {
      // Never try to solve or bypass a challenge: report it so the user sees the real state.
      throw new SourceUnavailableError(NAME, `HTTP ${response.status}; the source is refusing requests from the hosting network`);
    }
    if (response.status === 429) throw new SourceUnavailableError(NAME, 'rate limited; try again later');
    if (response.status === 404) throw new SourceUnavailableError(NAME, 'title or chapter not found');
    if (!response.ok) throw new SourceUnavailableError(NAME, `HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new SourceUnavailableError(NAME, 'request timed out');
    throw new SourceUnavailableError(NAME, 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

function seriesPage(id: string) {
  const cached = seriesPages.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.html;
  if (seriesPages.size >= PAGE_CACHE_LIMIT) {
    const oldest = seriesPages.keys().next().value;
    if (oldest) seriesPages.delete(oldest);
  }
  // The site redirects /library/{any type}/{id}/{any slug} to the canonical URL.
  const html = zonaFetch(`/library/manga/${id}/x`);
  seriesPages.set(id, { expiresAt: Date.now() + PAGE_TTL_MS, html });
  html.catch(() => {
    if (seriesPages.get(id)?.html === html) seriesPages.delete(id);
  });
  return html;
}

export class ZonaTmoSource implements MangaSource {
  readonly id = 'zonatmo';
  readonly name = NAME;

  async search(query: string): Promise<Manga[]> {
    const q = query.trim().replace(/\s+/g, ' ').slice(0, 100);
    if (!q) return [];
    return parseSearchHtml(await zonaFetch(`/biblioteca?title=${encodeURIComponent(q)}`));
  }

  async getManga(id: string): Promise<Manga> {
    const rid = rawId(id, 'zt-');
    return parseMangaHtml(await seriesPage(rid), rid);
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const rid = rawId(mangaId, 'zt-');
    return parseChaptersHtml(await seriesPage(rid), rid);
  }

  async getChapterPages(chapterId: string) {
    const rid = rawId(chapterId, 'ztc-');
    const { pages } = parseReaderHtml(await zonaFetch(`/view_uploads/${rid}`), rid);
    if (!pages.length) throw new SourceUnavailableError(NAME, 'no readable page images were found');
    return pages;
  }
}

export const zonaTmoSource = new ZonaTmoSource();

export async function getZonaTmoChapterContext(chapterId: string) {
  const rid = rawId(chapterId, 'ztc-');
  const reader = parseReaderHtml(await zonaFetch(`/view_uploads/${rid}`), rid);
  if (!reader.pages.length) throw new SourceUnavailableError(NAME, 'no readable page images were found');

  const chapter = reader.chapters.find((item) => item.id === `ztc-${rid}`) ?? {
    id: `ztc-${rid}`,
    mangaId: reader.manga.id,
    sourceId: 'zonatmo',
    title: reader.chapterTitle,
    chapterNumber: 0,
    sourceUrl: `${ZONATMO_BASE}/view_uploads/${rid}`,
  };
  return { manga: reader.manga, chapter, chapters: reader.chapters, pages: reader.pages };
}
