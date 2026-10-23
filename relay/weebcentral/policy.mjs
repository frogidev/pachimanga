export const WEEBCENTRAL_ORIGIN = 'https://weebcentral.com';
export const ZONATMO_ORIGIN = 'https://zonatmo.org';
export const ALLOWED_UPSTREAM_ORIGINS = [WEEBCENTRAL_ORIGIN, ZONATMO_ORIGIN];
const ID = /^[0-9A-Z]{20,32}$/;
const ZONATMO_ID = /^\d{1,9}$/;

export function sanitizeRelayQuery(value) {
  return String(value || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function zonaTmoOperation(url) {
  if (url.pathname === '/v1/zonatmo/search') {
    const query = sanitizeRelayQuery(url.searchParams.get('q'));
    if (!query) return null;
    return {
      operation: 'zonatmo-search',
      key: `zonatmo-search:${query.toLowerCase()}`,
      ttl: 60_000,
      url: `${ZONATMO_ORIGIN}/biblioteca?${new URLSearchParams({ title: query }).toString()}`,
    };
  }
  const match = url.pathname.match(/^\/v1\/zonatmo\/(series|reader)\/(\d+)$/);
  if (!match || !ZONATMO_ID.test(match[2])) return null;
  const [, operation, id] = match;
  if (operation === 'series') {
    // The site redirects any type/slug to the canonical URL, so the id is enough.
    return { operation: 'zonatmo-series', key: `zonatmo-series:${id}`, ttl: 120_000, url: `${ZONATMO_ORIGIN}/library/manga/${id}/x` };
  }
  return { operation: 'zonatmo-reader', key: `zonatmo-reader:${id}`, ttl: 600_000, url: `${ZONATMO_ORIGIN}/view_uploads/${id}` };
}

export function relayOperationFromUrl(url) {
  if (url.pathname.startsWith('/v1/zonatmo/')) return zonaTmoOperation(url);

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
