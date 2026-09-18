import type { Manga } from '@/types/models';

function normalizedTitle(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

function titleKeys(manga: Manga) {
  return new Set(
    [manga.title, ...(manga.alternativeTitles || [])]
      .map(normalizedTitle)
      .filter(Boolean),
  );
}

export function mergeProviderSearchResults(groups: Manga[][]): Manga[] {
  const merged: Manga[] = [];
  const known = new Set<string>();

  for (const group of groups) {
    for (const manga of group) {
      const keys = titleKeys(manga);
      if ([...keys].some((key) => known.has(key))) continue;
      merged.push(manga);
      for (const key of keys) known.add(key);
    }
  }

  return merged;
}
