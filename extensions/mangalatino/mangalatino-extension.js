/**
 * MangaLatino Extension for Pachimanga
 * 
 * MangaLatino (mangalatino.com) - Latino/Spanish manga site
 * 
 * To install: Copy this file content and paste in Settings → Extensions → Install Extension
 */

exports.manifest = {
  id: 'mangalatino',
  name: 'MangaLatino',
  version: '1.0.0',
  description: 'Latino/Spanish manga from MangaLatino (community extension)',
  author: 'Pachimanga Community',
  sourceId: 'mangalatino',
  sourceName: 'MangaLatino',
  permissions: ['network'],
  languages: ['es'],
  contentRating: 'teen',
  website: 'https://mangalatino.com',
};

const BASE = 'https://mangalatino.com';

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Pachimanga/1.0.2 (+https://pachimanga.frogilab.dev)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function extractText(html: string, selector: string): string {
  const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim().replace(/<[^>]+>/g, '') : '';
}

function extractAttr(html: string, selector: string, attr: string): string {
  const regex = new RegExp(`<${selector}[^>]*${attr}=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : '';
}

function extractAll(html: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    results.push(match[1]);
  }
  return results;
}

exports.source = {
  async search(query: string) {
    const html = await fetchHtml(`${BASE}/buscar/${encodeURIComponent(query)}`);
    
    const manga = [];
    const items = extractAll(html, /<article[^>]*class="manga"[^>]*>([\s\S]*?)<\/article>/gi);
    
    for (const item of items) {
      const title = extractText(item, 'h3') || extractText(item, 'h2') || extractText(item, 'a');
      const href = extractAttr(item, 'a', 'href');
      const cover = extractAttr(item, 'img', 'src') || extractAttr(item, 'img', 'data-src');
      const idMatch = href?.match(/\/manga\/([^/]+)/);
      
      if (title && idMatch) {
        manga.push({
          id: `ml-${idMatch[1]}`,
          sourceId: 'mangalatino',
          title,
          alternativeTitles: [],
          description: '',
          coverUrl: cover ? new URL(cover, BASE).toString() : '',
          author: '',
          artist: '',
          status: 'unknown',
          genres: [],
          sourceUrl: href ? new URL(href, BASE).toString() : '',
        });
      }
    }
    return manga;
  },

  async getManga(id: string) {
    const mangaId = id.replace('ml-', '');
    const html = await fetchHtml(`${BASE}/manga/${mangaId}`);
    
    const title = extractText(html, 'h1') || 'Unknown';
    const cover = extractAttr(html, 'img.cover', 'src') || extractAttr(html, 'img', 'data-src');
    const author = extractText(html, 'span.autor') || extractText(html, 'div.autor');
    const description = extractText(html, 'div.sinopsis') || extractText(html, 'p.sinopsis');
    const statusText = extractText(html, 'span.estado') || 'unknown';
    const genres = extractAll(html, /<a[^>]*href="\/genero\/[^"]+"[^>]*>([^<]+)<\/a>/gi);
    
    const status = statusText.toLowerCase().includes('complet') ? 'complete' :
                   statusText.toLowerCase().includes('en curso') ? 'ongoing' :
                   statusText.toLowerCase().includes('hiatus') ? 'hiatus' : 'unknown';
    
    return {
      id: `ml-${mangaId}`,
      sourceId: 'mangalatino',
      title,
      alternativeTitles: [],
      description,
      coverUrl: cover ? new URL(cover, BASE).toString() : '',
      author,
      artist: '',
      status,
      genres,
      sourceUrl: `${BASE}/manga/${mangaId}`,
    };
  },

  async getChapters(mangaId: string) {
    const id = mangaId.replace('ml-', '');
    const html = await fetchHtml(`${BASE}/manga/${id}`);
    
    const chapters = [];
    const matches = html.matchAll(/<a[^>]*href="\/capitulo\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
    
    for (const match of matches) {
      const chapterUrl = match[1];
      const chapterTitle = extractText(match[2], 'span') || extractText(match[2], 'div');
      const chapterNumMatch = chapterTitle.match(/cap[ií]tulo\s+(\d+)/i);
      const chapterNumber = chapterNumMatch ? parseInt(chapterNumMatch[1], 10) : 0;
      
      chapters.push({
        id: `mlc-${chapterUrl.split('/').pop()}`,
        mangaId: `ml-${id}`,
        sourceId: 'mangalatino',
        title: chapterTitle || `Capítulo ${chapterNumber}`,
        chapterNumber,
        sourceUrl: `${BASE}/capitulo/${chapterUrl}`,
      });
    }
    
    return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  },

  async getChapterPages(chapterId: string) {
    const id = chapterId.replace('mlc-', '');
    const html = await fetchHtml(`${BASE}/capitulo/${id}`);
    
    const imageUrls = extractAll(html, /<img[^>]*class="page-image"[^>]*src="([^"]+)"/gi)
      .concat(extractAll(html, /<img[^>]*data-src="([^"]+)"/gi));
    
    return imageUrls.map((url, index) => ({
      index,
      imageUrl: new URL(url, BASE).toString(),
    }));
  },
};