import type { MangaSource } from '@/sources/core/manga-source';
import { SourceUnavailableError } from '@/sources/core/manga-source';
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

function rawId(value: string) {
  const id = value.replace(/^wc-/, '');
  if (!ID.test(id)) throw new Error('Invalid WeebCentral identifier.');
  return id;
}

type WcFetchOptions = {
  revalidate?: number;
  referer?: string;
  hxTarget?: string;
  hx?: boolean;
};

async function wcFetch(path: string, options: WcFetchOptions = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const revalidate = options.revalidate ?? 300;

  const headers: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'Pachimanga/0.4 (+https://pachimanga.frogilab.dev)',
  };

  if (options.referer) headers.Referer = options.referer;
  if (options.hx) {
    headers['HX-Request'] = 'true';
    headers['HX-Current-URL'] = options.referer ?? `${BASE}/`;
  }
  if (options.hxTarget) headers['HX-Target'] = options.hxTarget;

  try {
    const response = await fetch(`${BASE}${path}`, {
      headers,
      signal: controller.signal,
      next: { revalidate },
    });

    if (response.status === 403) {
      throw new SourceUnavailableError(
        'WeebCentral',
        'HTTP 403; the source is refusing requests from the hosting network',
      );
    }
    if (response.status === 429) {
      throw new SourceUnavailableError('WeebCentral', 'rate limited; try again later');
    }
    if (!response.ok) {
      throw new SourceUnavailableError('WeebCentral', `HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SourceUnavailableError('WeebCentral', 'request timed out');
    }
    throw new SourceUnavailableError('WeebCentral', 'network request failed');
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
      revalidate: 60,
      referer: searchPage,
      hx: true,
    });
    return parseSearchHtml(html);
  }

  async getManga(id: string) {
    const rid = rawId(id);
    return parseMangaHtml(
      await wcFetch(`/series/${rid}`, { revalidate: 300 }),
      rid,
    );
  }

  async getChapters(mangaId: string) {
    const rid = rawId(mangaId);
    const seriesUrl = `${BASE}/series/${rid}`;
    const html = await wcFetch(`/series/${rid}/full-chapter-list`, {
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
  const html = await wcFetch(`/chapters/${rid}`, { revalidate: 3600 });
  const mangaRaw = parseChapterSeriesId(html);
  if (!mangaRaw) {
    throw new SourceUnavailableError('WeebCentral', 'chapter series could not be resolved');
  }

  const [manga, chapters, pages] = await Promise.all([
    weebCentralSource.getManga(mangaRaw),
    weebCentralSource.getChapters(mangaRaw),
    wcFetch(`/chapters/${rid}/images?is_prev=False&reading_style=long_strip&current_page=1`, {
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
