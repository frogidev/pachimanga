export const WEEBCENTRAL_ORIGIN = 'https://weebcentral.com';
const ID = /^[0-9A-Z]{20,32}$/;

export function sanitizeRelayQuery(value) {
  return String(value || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

export function relayOperationFromUrl(url) {
  if (url.pathname === '/v1/search') {
    const query = sanitizeRelayQuery(url.searchParams.get('q'));
    if (!query) return null;
    const params = new URLSearchParams({
      text: query,
      sort: 'Best Match',
      order: 'Descending',
      official: 'Any',
      anime: 'Any',
      adult: 'Any',
      display_mode: 'Full Display',
      offset: '0',
    });
    return {
      operation: 'search',
      key: `search:${query.toLowerCase()}`,
      ttl: 60_000,
      url: `${WEEBCENTRAL_ORIGIN}/search/data?${params.toString()}`,
      referer: `${WEEBCENTRAL_ORIGIN}/search?text=${encodeURIComponent(query)}`,
      hx: true,
      hxTarget: undefined,
    };
  }

  const match = url.pathname.match(/^\/v1\/(manga|chapters|chapter|pages)\/([0-9A-Z]{20,32})$/);
  if (!match) return null;
  const [, operation, id] = match;
  if (!ID.test(id)) return null;

  if (operation === 'manga') {
    return { operation, key: `manga:${id}`, ttl: 300_000, url: `${WEEBCENTRAL_ORIGIN}/series/${id}` };
  }
  if (operation === 'chapters') {
    return {
      operation,
      key: `chapters:${id}`,
      ttl: 120_000,
      url: `${WEEBCENTRAL_ORIGIN}/series/${id}/full-chapter-list`,
      referer: `${WEEBCENTRAL_ORIGIN}/series/${id}`,
      hx: true,
      hxTarget: 'chapter-list',
    };
  }
  if (operation === 'chapter') {
    return { operation, key: `chapter:${id}`, ttl: 3_600_000, url: `${WEEBCENTRAL_ORIGIN}/chapters/${id}` };
  }
  return {
    operation,
    key: `pages:${id}`,
    ttl: 3_600_000,
    url: `${WEEBCENTRAL_ORIGIN}/chapters/${id}/images?is_prev=False&reading_style=long_strip&current_page=1`,
    referer: `${WEEBCENTRAL_ORIGIN}/chapters/${id}`,
    hx: true,
    hxTarget: 'chapter-images',
  };
}
