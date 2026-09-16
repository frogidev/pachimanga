export function buildComicKSearchPath(query: string, limit = 24) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return `/v1.0/search/?${params.toString()}`;
}

export function buildMangaDexFeedPath(mangaId: string, offset: number, limit: number) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    includeExternalUrl: '0',
  });
  params.append('translatedLanguage[]', 'en');
  params.append('order[chapter]', 'desc');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  return `/manga/${encodeURIComponent(mangaId)}/feed?${params.toString()}`;
}
