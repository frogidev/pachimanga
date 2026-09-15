import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import { fetchWithSourceRetry } from '@/sources/core/source-fetch';
import {
  parseChapterSeriesId,
  parseChapterTitle,
  parseChaptersHtml,
  parseMangaHtml,
  parsePagesHtml,
  parseSearchHtml,
} from './parser';

const BASE = 'https://weebcentral.com';
const ID = /^[0-9A-Z]{20,32}$/;

type NativeOperation = 'search' | 'manga' | 'chapters' | 'chapter' | 'pages';

type WcFetchOptions = {
  revalidate?: number;
  referer?: string;
  hxTarget?: string;
  hx?: boolean;
  operation: NativeOperation;
  query?: string;
  id?: string;
};

function relayBase() {
  return process.env.WEEBCENTRAL_RELAY_URL?.trim().replace(/\/+$/, '') || null;
}

function relayToken() {
  return process.env.WEEBCENTRAL_RELAY_TOKEN?.trim() || null;
}

export function isWeebCentralRelayConfigured() {
  return Boolean(relayBase() && relayToken());
}

export function getWeebCentralTransport(): 'relay' | 'direct' {
  return isWeebCentralRelayConfigured() ? 'relay' : 'direct';
}

function rawId(value: string) {
  const id = value.replace(/^wc-/, '');
  if (!ID.test(id)) throw new Error('Invalid WeebCentral identifier.');
  return id;
}

function relayRequestUrl(operation: NativeOperation, input: { query?: string; id?: string }) {
  const base = relayBase();
  if (!base) throw new Error('WeebCentral relay URL is not configured.');

  if (operation === 'search') {
    const query = input.query?.trim() || '';
    return `${base}/v1/search?q=${encodeURIComponent(query)}`;
  }

  const id = input.id;
  if (!id || !ID.test(id)) throw new Error('Invalid WeebCentral relay identifier.');
  return `${base}/v1/${operation}/${id}`;
}

async function wcFetch(path: string, options: WcFetchOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const revalidate = options.revalidate ?? 300;
  const relay = isWeebCentralRelayConfigured();
  const headers: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml',
  };

  let url = `${BASE}${path}`;
  if (relay) {
    const token = relayToken();
    if (!token) throw new Error('WeebCentral relay token is not configured.');
    url = relayRequestUrl(options.operation, { query: options.query, id: options.id });
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['User-Agent'] = 'Pachimanga/0.4 (+https://pachimanga.frogilab.dev)';
    if (options.referer) headers.Referer = options.referer;
    if (options.hx) {
      headers['HX-Request'] = 'true';
      headers['HX-Current-URL'] = options.referer ?? `${BASE}/`;
    }
    if (options.hxTarget) headers['HX-Target'] = options.hxTarget;
  }

  try {
    const response = await fetchWithSourceRetry(url, {
      headers,
      signal: controller.signal,
      next: { revalidate },
    });

    if (response.status === 401 || response.status === 403) {
      throw new SourceUnavailableError(
        'WeebCentral',
        relay ? `private relay rejected the request (HTTP ${response.status})` : 'HTTP 403; the source is refusing requests from the hosting network',
      );
    }
    if (response.status === 429) {
      throw new SourceUnavailableError('WeebCentral', relay ? 'private relay rate limited the request' : 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('WeebCentral', `${relay ? 'relay ' : ''}HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('WeebCentral', relay ? 'private relay request timed out' : 'request timed out');
    }
    throw new SourceUnavailableError('WeebCentral', relay ? 'private relay network request failed' : 'network request failed');
  } finally {
    clearTimeout(timer);
  }
}

export async function probeWeebCentralServer(): Promise<{
  ok: boolean;
  transport: 'relay' | 'direct';
  error?: string;
}> {
  const transport = getWeebCentralTransport();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);

  try {
    if (transport === 'relay') {
      const base = relayBase();
      const token = relayToken();
      if (!base || !token) return { ok: false, transport, error: 'relay configuration is incomplete' };
      const response = await fetchWithSourceRetry(`${base}/health/upstream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return { ok: false, transport, error: `relay health HTTP ${response.status}` };
      const body = (await response.json()) as { ok?: boolean; upstreamStatus?: number; error?: string };
      return body.ok
        ? { ok: true, transport }
        : { ok: false, transport, error: body.error || `upstream HTTP ${body.upstreamStatus ?? 'unknown'}` };
    }

    const response = await fetchWithSourceRetry(BASE, {
      headers: { 'User-Agent': 'Pachimanga/0.4 (+https://pachimanga.frogilab.dev)' },
      signal: controller.signal,
      cache: 'no-store',
    });
    return response.ok
      ? { ok: true, transport }
      : { ok: false, transport, error: `direct HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      transport,
      error: error instanceof Error ? error.message : 'health request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export class WeebCentralSource implements MangaSource {
  readonly id = 'weebcentral';
  readonly name = 'WeebCentral';

  async search(query: string) {
    const q = query
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    if (!q) return [];

    const searchPage = `${BASE}/search?text=${encodeURIComponent(q)}`;
    const params = new URLSearchParams({
      text: q,
      sort: 'Best Match',
      order: 'Descending',
      official: 'Any',
      anime: 'Any',
      adult: 'Any',
      display_mode: 'Full Display',
      offset: '0',
    });

    const html = await wcFetch(`/search/data?${params.toString()}`, {
      operation: 'search',
      query: q,
      revalidate: 60,
      referer: searchPage,
      hx: true,
    });
    return parseSearchHtml(html);
  }

  async getManga(id: string) {
    const rid = rawId(id);
    return parseMangaHtml(
      await wcFetch(`/series/${rid}`, { operation: 'manga', id: rid, revalidate: 300 }),
      rid,
    );
  }

  async getChapters(mangaId: string) {
    const rid = rawId(mangaId);
    const seriesUrl = `${BASE}/series/${rid}`;
    const html = await wcFetch(`/series/${rid}/full-chapter-list`, {
      operation: 'chapters',
      id: rid,
      revalidate: 120,
      referer: seriesUrl,
      hx: true,
      hxTarget: 'chapter-list',
    });
    return parseChaptersHtml(html, rid);
  }

  async getChapterPages(chapterId: string) {
    const rid = rawId(chapterId);
    const chapterUrl = `${BASE}/chapters/${rid}`;
    const html = await wcFetch(
      `/chapters/${rid}/images?is_prev=False&reading_style=long_strip&current_page=1`,
      {
        operation: 'pages',
        id: rid,
        revalidate: 3600,
        referer: chapterUrl,
        hx: true,
        hxTarget: 'chapter-images',
      },
    );
    const pages = parsePagesHtml(html);
    if (!pages.length) {
      throw new SourceUnavailableError('WeebCentral', 'no readable page images were found');
    }
    return pages;
  }
}

export const weebCentralSource = new WeebCentralSource();

export async function getWeebCentralChapterContext(chapterId: string) {
  const rid = rawId(chapterId);
  const chapterUrl = `${BASE}/chapters/${rid}`;
  const html = await wcFetch(`/chapters/${rid}`, { operation: 'chapter', id: rid, revalidate: 3600 });
  const mangaRaw = parseChapterSeriesId(html);
  if (!mangaRaw) {
    throw new SourceUnavailableError('WeebCentral', 'chapter series could not be resolved');
  }

  const [manga, chapters, pages] = await Promise.all([
    weebCentralSource.getManga(mangaRaw),
    weebCentralSource.getChapters(mangaRaw),
    wcFetch(`/chapters/${rid}/images?is_prev=False&reading_style=long_strip&current_page=1`, {
      operation: 'pages',
      id: rid,
      revalidate: 3600,
      referer: chapterUrl,
      hx: true,
      hxTarget: 'chapter-images',
    }).then(parsePagesHtml),
  ]);

  const chapter = chapters.find((item) => item.id === `wc-${rid}`) || {
    id: `wc-${rid}`,
    mangaId: manga.id,
    sourceId: 'weebcentral',
    title: parseChapterTitle(html),
    chapterNumber: 0,
    sourceUrl: chapterUrl,
  };

  if (!pages.length) {
    throw new SourceUnavailableError('WeebCentral', 'no readable page images were found');
  }

  return { manga, chapter, chapters, pages };
}
