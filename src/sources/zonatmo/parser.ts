import type { Chapter, Manga, MangaStatus, Page } from '@/types/models';

export const ZONATMO_BASE = 'https://zonatmo.org';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function statusFrom(value: string): MangaStatus {
  const text = value.toLowerCase();
  if (/finaliz|complet|finished/.test(text)) return 'complete';
  if (/public|emisi|ongoing/.test(text)) return 'ongoing';
  if (/paus|hiato|hiatus/.test(text)) return 'hiatus';
  if (/cancel|abandon|dropped/.test(text)) return 'cancelled';
  return 'unknown';
}

function absolute(url: string) {
  return new URL(url, ZONATMO_BASE).toString();
}

const LIBRARY_LINK = /href="(?:https:\/\/zonatmo\.org)?\/library\/([a-z_]+)\/(\d+)\/([^"?#]+)"/i;

function mangaSkeleton(id: string, type: string, slug: string): Manga {
  return {
    id: `zt-${id}`,
    sourceId: 'zonatmo',
    title: '',
    alternativeTitles: [],
    description: '',
    coverUrl: absolute(`/storage/covers/${id}.webp`),
    author: '',
    artist: '',
    status: 'unknown',
    genres: [type.replace(/_/g, ' ')],
    sourceUrl: `${ZONATMO_BASE}/library/${type}/${id}/${slug}`,
    language: 'es',
  };
}

/** `https://zonatmo.org/biblioteca?title=…` result cards. */
export function parseSearchHtml(html: string): Manga[] {
  const results: Manga[] = [];
  const seen = new Set<string>();
  for (const chunk of html.split('data-identifier="').slice(1)) {
    const link = chunk.match(LIBRARY_LINK);
    if (!link) continue;
    const [, type, id, slug] = link;
    if (seen.has(id) || type === 'novela') continue;
    const title = decodeHtml(chunk.match(/<h4\b[^>]*title="([^"]*)"/i)?.[1] ?? '');
    if (!title) continue;
    seen.add(id);
    const manga = mangaSkeleton(id, type, slug);
    manga.title = title;
    manga.status = statusFrom(chunk.match(/book-meta-status[^>]*>([^<]*)</i)?.[1] ?? '');
    const cover = chunk.match(/data-bg="([^"]+)"/i)?.[1] ?? chunk.match(/<img\b[^>]*src="([^"]+)"/i)?.[1];
    if (cover) manga.coverUrl = absolute(decodeHtml(cover));
    results.push(manga);
    if (results.length >= 40) break;
  }
  return results;
}

/** Series page (`/library/{type}/{id}/{slug}`). */
export function parseMangaHtml(html: string, id: string): Manga {
  const canonical = html.match(/rel="canonical"[^>]*href="[^"]*\/library\/([a-z_]+)\/\d+\/([^"?#]+)"/i)
    ?? html.match(/href="[^"]*\/library\/([a-z_]+)\/\d+\/([^"?#]+)"[^>]*rel="canonical"/i);
  const manga = mangaSkeleton(id, canonical?.[1] ?? 'manga', canonical?.[2] ?? 'x');
  manga.title = decodeHtml(html.match(/<h1\b[^>]*class="[^"]*element-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') || 'Sin título';
  manga.description = decodeHtml(html.match(/<p\b[^>]*class="element-description[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
  const cover = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1];
  if (cover) manga.coverUrl = absolute(decodeHtml(cover));
  manga.status = statusFrom(html.match(/class="book-status[^"]*"[^>]*>([\s\S]*?)<\/span>\s*(?:<\/|<h5)/i)?.[1] ?? '');
  const people = (kind: string) => [...html.matchAll(new RegExp(`filter_by=${kind}&amp;title=[^"]*"[^>]*>([^<]+)<`, 'gi'))].map((m) => decodeHtml(m[1]));
  manga.author = [...new Set(people('author'))].join(', ');
  manga.artist = [...new Set(people('artist'))].join(', ');
  return manga;
}

function parseDate(value: string | undefined) {
  const match = value?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

/** Chapter rows of the series page; several uploads can exist per chapter, the first one wins. */
export function parseChaptersHtml(html: string, mangaId: string): Chapter[] {
  const chapters: Chapter[] = [];
  const seen = new Set<string>();
  for (const chunk of html.split('class="list-group-item p-0 bg-light upload-link"').slice(1)) {
    const number = chunk.match(/data-chapter-number="([^"]+)"/)?.[1];
    const uploadId = chunk.match(/\/view_uploads\/(\d+)/)?.[1];
    if (!number || !uploadId || seen.has(number)) continue;
    seen.add(number);
    const chapterNumber = Number(number);
    chapters.push({
      id: `ztc-${uploadId}`,
      mangaId: `zt-${mangaId}`,
      sourceId: 'zonatmo',
      title: decodeHtml(chunk.match(/class="chapter-number[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '') || `Capítulo ${number}`,
      chapterNumber: Number.isFinite(chapterNumber) ? chapterNumber : 0,
      publishedAt: parseDate(chunk.match(/fa-calendar[^>]*><\/i>\s*([^<]+)</i)?.[1]),
      sourceUrl: `${ZONATMO_BASE}/view_uploads/${uploadId}`,
    });
  }
  return chapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
}

export type ReaderPage = {
  manga: Manga;
  chapters: Chapter[];
  pages: Page[];
  chapterTitle: string;
};

/** Reader page (`/view_uploads/{id}`): images, the series link and the full chapter selector. */
export function parseReaderHtml(html: string, uploadId: string): ReaderPage {
  const header = html.slice(html.indexOf('id="reader-header"'));
  const link = header.match(LIBRARY_LINK);
  if (!link) throw new Error('ZonaTMO chapter series could not be resolved');
  const [, type, mangaId, slug] = link;
  const manga = mangaSkeleton(mangaId, type, slug);
  manga.title = decodeHtml(header.match(/<span class="d-none d-sm-inline">([^<]+)</i)?.[1] ?? '') || 'Sin título';

  // One entry per chapter number; the open upload replaces another upload of the same chapter.
  const byKey = new Map<string, Chapter>();
  for (const option of header.matchAll(/<option\s+value="[^"]*\/view_uploads\/(\d+)"[^>]*>([\s\S]*?)<\/option>/gi)) {
    const [, id, rawLabel] = option;
    const label = decodeHtml(rawLabel);
    const number = label.match(/^Cap\.?\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] ?? '';
    const key = number || id;
    if (byKey.has(key) && id !== uploadId) continue;
    const subtitle = label.split(/\s[—–-]\s/).slice(1).join(' — ').trim();
    const title = subtitle && !/^cap[ií]tulo\s*\d/i.test(subtitle) ? subtitle : number ? `Capítulo ${number}` : label;
    byKey.set(key, {
      id: `ztc-${id}`,
      mangaId: manga.id,
      sourceId: 'zonatmo',
      title,
      chapterNumber: Number(number) || 0,
      sourceUrl: `${ZONATMO_BASE}/view_uploads/${id}`,
    });
  }

  const urls = [...html.matchAll(/<img\b[^>]*class="reader-image"[^>]*>/gi)]
    .map((tag) => tag[0].match(/\ssrc="([^"]+)"/)?.[1])
    .filter((src): src is string => Boolean(src));
  const pages = [...new Set(urls)].map((imageUrl, index) => ({ index, imageUrl: absolute(imageUrl) }));

  const chapters = [...byKey.values()].sort((a, b) => b.chapterNumber - a.chapterNumber);
  const current = chapters.find((chapter) => chapter.id === `ztc-${uploadId}`);
  const chapterTitle = current?.title
    || decodeHtml(html.match(/<title>([^<]*)/i)?.[1] ?? '').replace(/\s*—\s*ZonaTMO.*$/i, '')
    || 'Capítulo';
  return { manga, chapters, pages, chapterTitle };
}
