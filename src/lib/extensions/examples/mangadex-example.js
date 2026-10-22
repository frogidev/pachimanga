/**
 * Example Extension: MangaDex (Demonstration)
 * This is a template showing how to create a Pachimanga extension.
 * 
 * To install: Copy this code and paste it in the Extension Manager.
 */

// Extension manifest - REQUIRED
exports.manifest = {
  id: 'example-mangadex',
  name: 'MangaDex (Example)',
  version: '1.0.0',
  description: 'Example MangaDex source extension demonstrating the extension API',
  author: 'Pachimanga Team',
  website: 'https://github.com/pachimanga',
  sourceId: 'mangadex-example',
  sourceName: 'MangaDex (Example)',
  permissions: ['network'],
  languages: ['en'],
  contentRating: 'teen',
};

// Utility functions
const BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

function localized(obj: Record<string, string> | undefined): string {
  if (!obj) return '';
  return obj.en || obj['en-us'] || Object.values(obj)[0] || '';
}

function getCoverUrl(mangaId: string, coverFileName: string | undefined): string {
  if (!coverFileName) return '';
  return `${COVER_BASE}/${mangaId}/${coverFileName}.256.jpg`;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Source implementation - REQUIRED
exports.source = {
  async search(query: string) {
    const url = `${BASE}/manga?title=${encodeURIComponent(query)}&limit=20&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;
    const data = await fetchJson(url) as { data: unknown[]; total: number };
    
    return (data.data || []).map((item: unknown) => {
      const manga = item as Record<string, unknown>;
      const attributes = manga.attributes as Record<string, unknown>;
      const relationships = (manga.relationships || []) as unknown[];
      const coverArt = relationships.find((r: unknown) => (r as Record<string, unknown>).type === 'cover_art');
      const coverFileName = coverArt ? (coverArt as Record<string, unknown>).attributes?.fileName as string : undefined;
      
      return {
        id: `md-${manga.id}`,
        sourceId: 'mangadex-example',
        title: localized(attributes.title as Record<string, string>),
        alternativeTitles: [],
        description: localized(attributes.description as Record<string, string>),
        coverUrl: getCoverUrl(manga.id as string, coverFileName),
        author: '',
        artist: '',
        status: (attributes.status as string) || 'unknown',
        genres: ((attributes.tags as unknown[]) || []).map((t: unknown) => localized((t as Record<string, unknown>).attributes?.name as Record<string, string>)),
        sourceUrl: `https://mangadex.org/title/${manga.id}`,
      };
    });
  },

  async getManga(id: string) {
    const mangaId = id.replace('md-', '');
    const url = `${BASE}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    const data = await fetchJson(url) as { data: unknown };
    const manga = data.data as Record<string, unknown>;
    const attributes = manga.attributes as Record<string, unknown>;
    const relationships = (manga.relationships || []) as unknown[];
    const coverArt = relationships.find((r: unknown) => (r as Record<string, unknown>).type === 'cover_art');
    const coverFileName = coverArt ? (coverArt as Record<string, unknown>).attributes?.fileName as string : undefined;
    const authorRel = relationships.find((r: unknown) => (r as Record<string, unknown>).type === 'author');
    const artistRel = relationships.find((r: unknown) => (r as Record<string, unknown>).type === 'artist');
    const authorName = authorRel ? localized((authorRel as Record<string, unknown>).attributes?.name as Record<string, string>) : '';
    const artistName = artistRel ? localized((artistRel as Record<string, unknown>).attributes?.name as Record<string, string>) : '';
    
    return {
      id: `md-${manga.id}`,
      sourceId: 'mangadex-example',
      title: localized(attributes.title as Record<string, string>),
      alternativeTitles: Object.values(attributes.altTitles as Record<string, string> || {}),
      description: localized(attributes.description as Record<string, string>),
      coverUrl: getCoverUrl(manga.id as string, coverFileName),
      author: authorName,
      artist: artistName,
      status: (attributes.status as string) || 'unknown',
      genres: ((attributes.tags as unknown[]) || []).map((t: unknown) => localized((t as Record<string, unknown>).attributes?.name as Record<string, string>)),
      sourceUrl: `https://mangadex.org/title/${manga.id}`,
    };
  },

  async getChapters(mangaId: string) {
    const id = mangaId.replace('md-', '');
    const url = `${BASE}/chapter?manga=${id}&limit=500&order[chapter]=asc&includes[]=scanlation_group&translatedLanguage[]=en`;
    const data = await fetchJson(url) as { data: unknown[]; total: number };
    
    return (data.data || []).map((item: unknown) => {
      const chapter = item as Record<string, unknown>;
      const attributes = chapter.attributes as Record<string, unknown>;
      return {
        id: `md-${chapter.id}`,
        mangaId,
        sourceId: 'mangadex-example',
        title: attributes.title ? String(attributes.title) : `Chapter ${attributes.chapter}`,
        chapterNumber: Number(attributes.chapter || 0),
        volumeNumber: attributes.volume ? Number(attributes.volume) : undefined,
        publishedAt: attributes.publishAt as string,
        sourceUrl: `https://mangadex.org/chapter/${chapter.id}`,
      };
    });
  },

  async getChapterPages(chapterId: string) {
    const id = chapterId.replace('md-', '');
    const url = `${BASE}/at-home/server/${id}`;
    const data = await fetchJson(url) as { baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } };
    
    return data.chapter.data.map((fileName, index) => ({
      index,
      imageUrl: `${data.baseUrl}/data/${data.chapter.hash}/${fileName}`,
    }));
  },
};