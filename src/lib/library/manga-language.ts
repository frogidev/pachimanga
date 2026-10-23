import type { MangaLanguage } from '@/types/models';

/** Language of the providers we ship; titles loaded from the cloud carry no `language` field. */
const SOURCE_LANGUAGE: Record<string, MangaLanguage> = {
  weebcentral: 'en',
  zonatmo: 'es',
};

/** Language of a saved title: its own tag, else its provider's language, else unknown (null). */
export function libraryTitleLanguage(entry: { sourceId: string; manga?: { language?: MangaLanguage } | null }): MangaLanguage | null {
  return entry.manga?.language ?? SOURCE_LANGUAGE[entry.sourceId] ?? null;
}
