import type { Chapter, Manga } from '@/types/models';
import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import { isRelayConfigured, relayBase, relayToken } from '@/sources/core/relay';
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

/** One known upstream read: its direct path and the matching fixed relay operation. */
type Operation = { path: string; relayPath: string };

const operations = {
  search: (query: string): Operation => ({
    path: `/biblioteca?title=${encodeURIComponent(query)}`,
    relayPath: `/v1/zonatmo/search?q=${encodeURIComponent(query)}`,
  }),
  // The site redirects /library/{any type}/{id}/{any slug} to the canonical URL.
  series: (id: string): Operation => ({ path: `/library/manga/${id}/x`, relayPath: `/v1/zonatmo/series/${id}` }),
  reader: (id: string): Operation => ({ path: `/view_uploads/${id}`, relayPath: `/v1/zonatmo/reader/${id}` }),
};

// Series pages list every chapter (~1 MB), so share one in-flight/short-lived fetch per series
// between getManga and getChapters instead of using the oversized Next data cache.
const seriesPages = new Map<string, { expiresAt: number; html: Promise<string> }>();

function rawId(value: string, prefix: 'zt-' | 'ztc-') {
  const id = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  if (!ID.test(id)) throw new Error('Invalid ZonaTMO identifier.');
  return id;
}

/** Maps an HTTP status (direct, or the upstream status a relay reports) to an explicit failure. */
function statusError(status: number, relay: boolean, via: string) {
  if (status === 401) return new SourceUnavailableError(NAME, 'private relay rejected the request (check the relay token)');
  if (status === 403 || status === 503) {
    // Never try to solve or bypass a challenge: report it so the user sees the real state.
    return new SourceUnavailableError(NAME, `HTTP ${status}; the source is refusing requests from ${relay ? 'the relay network' : 'the hosting network'}`);
  }
  if (status === 429) return new SourceUnavailableError(NAME, 'rate limited; try again later');
  if (status === 404) return new SourceUnavailableError(NAME, 'title or chapter not found');
  return new SourceUnavailableError(NAME, `${via}HTTP ${status}`);
}

async function zonaFetch(operation: Operation): Promise<string> {
  const relay = isRelayConfigured();
  const headers: Record<string, string> = { Accept: 'text/html,application/xhtml+xml' };
  let url = `${ZONATMO_BASE}${operation.path}`;
  if (relay) {
    url = `${relayBase()}${operation.relayPath}`;
    headers.Authorization = `Bearer ${relayToken()}`;
  } else {
    headers['User-Agent'] = 'Pachimanga/1.0.2 (+https://pachimanga.frogilab.dev)';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchWithSourceRetry(url, { headers, signal: controller.signal, cache: 'no-store' });
    if (response.headers.get('cf-mitigated') === 'challenge') throw statusError(403, relay, '');
    if (!response.ok) {
      let status = response.status;
      if (relay) {
        // The relay reports an upstream failure as {"error":"upstream_error","upstreamStatus":N}.
        const body = await response.json().catch(() => null) as { error?: string; upstreamStatus?: number } | null;
        if (body?.error === 'upstream_error' && typeof body.upstreamStatus === 'number') status = body.upstreamStatus;
      }
      throw statusError(status, relay, relay ? 'relay ' : '');
    }
    return await response.text();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new SourceUnavailableError(NAME, relay ? 'private relay request timed out' : 'request timed out');
    throw new SourceUnavailableError(NAME, relay ? 'private relay network request failed' : 'network request failed');
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
  const html = zonaFetch(operations.series(id));
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
    return parseSearchHtml(await zonaFetch(operations.search(q)));
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
    const { pages } = parseReaderHtml(await zonaFetch(operations.reader(rid)), rid);
    if (!pages.length) throw new SourceUnavailableError(NAME, 'no readable page images were found');
    return pages;
  }
}

export const zonaTmoSource = new ZonaTmoSource();

export async function getZonaTmoChapterContext(chapterId: string) {
  const rid = rawId(chapterId, 'ztc-');
  const reader = parseReaderHtml(await zonaFetch(operations.reader(rid)), rid);
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
