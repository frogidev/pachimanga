/**
 * LectorTMO Extension for Pachimanga
 * 
 * LectorTMO (lectortmo.com) - Popular Spanish manga aggregator
 * 
 * To install: Copy this file content and paste in Settings → Extensions → Install Extension
 * 
 * Note: This is a template. Actual implementation requires:
 * - Reverse engineering their API/HTML structure
 * - Handling Cloudflare/anti-bot protection
 * - Respecting rate limits and robots.txt
 */

exports.manifest = {
  id: 'lectortmo',
  name: 'LectorTMO',
  version: '1.0.0',
  description: 'Spanish manga from LectorTMO (community extension)',
  author: 'Pachimanga Community',
  sourceId: 'lectortmo',
  sourceName: 'LectorTMO',
  permissions: ['network'],
  languages: ['es'],
  contentRating: 'teen',
  website: 'https://lectortmo.com',
};

// Utility functions
const BASE = 'https://lectortmo.com';

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
    const html = await fetchHtml(`${BASE}/busqueda/${encodeURIComponent(query)}`);
    
    // Parse search results - adjust selectors based on actual HTML structure
    const items = extractAll(html, /<a[^>]*class="manga-item"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
    
    const manga = [];
    for (let i = 0; i < items.length; i += 2) {
      const href = items[i];
      const innerHtml = items[i + 1];
      
      const title = extractText(innerHtml, 'h3') || extractText(innerHtml, 'div.title');
      const cover = extractAttr(innerHtml, 'img', 'src') || extractAttr(innerHtml, 'img', 'data-src');
      const idMatch = href.match(/\/manga\/([^/]+)/);
      
      if (title && idMatch) {
        manga.push({
          id: `lt-${idMatch[1]}`,
          sourceId: 'lectortmo',
          title,
          alternativeTitles: [],
          description: '',
          coverUrl: cover ? new URL(cover, BASE).toString() : '',
          author: '',
          artist: '',
          status: 'unknown',
          genres: [],
          sourceUrl: new URL(href, BASE).toString(),
        });
      }
    }
    return manga;
  },

  async getManga(id: string) {
    const mangaId = id.replace('lt-', '');
    const html = await fetchHtml(`${BASE}/manga/${mangaId}`);
    
    const title = extractText(html, 'h1.title') || extractText(html, 'h1');
    const cover = extractAttr(html, 'img.cover', 'src') || extractAttr(html, 'img', 'data-src');
    const author = extractText(html, 'div.author') || extractText(html, 'span.author');
    const description = extractText(html, 'div.description') || extractText(html, 'p.description');
    const statusText = extractText(html, 'span.status') || 'unknown';
    const genres = extractAll(html, /<a[^>]*class="genre"[^>]*>([^<]+)<\/a>/gi);
    
    const status = statusText.toLowerCase().includes('complet') ? 'complete' :
                   statusText.toLowerCase().includes('en curso') ? 'ongoing' :
                   statusText.toLowerCase().includes('hiatus') ? 'hiatus' : 'unknown';
    
    return {
      id: `lt-${mangaId}`,
      sourceId: 'lectortmo',
      title: title || 'Unknown',
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
    const id = mangaId.replace('lt-', '');
    const html = await fetchHtml(`${BASE}/manga/${id}`);
    
    const chapters = [];
    const chapterMatches = html.matchAll(/<a[^>]*href="\/capitulo\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
    
    for (const match of chapterMatches) {
      const chapterUrl = match[1];
      const chapterTitle = extractText(match[2], 'span') || extractText(match[2], 'div');
      const chapterNumMatch = chapterTitle.match(/cap[ií]tulo\s+(\d+)/i);
      const chapterNumber = chapterNumMatch ? parseInt(chapterNumMatch[1], 10) : 0;
      
      chapters.push({
        id: `ltc-${chapterUrl.split('/').pop()}`,
        mangaId: `lt-${id}`,
        sourceId: 'lectortmo',
        title: chapterTitle || `Capítulo ${chapterNumber}`,
        chapterNumber,
        sourceUrl: `${BASE}/capitulo/${chapterUrl}`,
      });
    }
    
    return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  },

  async getChapterPages(chapterId: string) {
    const id = chapterId.replace('ltc-', '');
    const html = await fetchHtml(`${BASE}/capitulo/${id}`);
    
    // Extract image URLs from reader page
    const imageUrls = extractAll(html, /<img[^>]*class="page-img"[^>]*src="([^"]+)"/gi)
      .concat(extractAll(html, /<img[^>]*data-src="([^"]+)"/gi));
    
    return imageUrls.map((url, index) => ({
      index,
      imageUrl: new URL(url, BASE).toString(),
    }));
  },
};