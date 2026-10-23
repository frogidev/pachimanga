const SOURCE_NAMES: Record<string, string> = {
  weebcentral: 'WeebCentral',
  zonatmo: 'ZonaTMO',
  mangaplus: 'MangaPlus',
  webtoon: 'Webtoon',
  import: 'Local import',
};

/** Human name for a provider id, or null when the id is not a known source. */
export function sourceDisplayName(sourceId: string): string | null {
  return SOURCE_NAMES[sourceId] ?? null;
}
