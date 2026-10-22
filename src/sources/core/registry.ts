import type { MangaSource } from "@/sources/core/manga-source";
import { mangaPlusSource } from "@/sources/mangaplus/mangaplus-source";
import { webtoonSource } from "@/sources/webtoon/webtoon-source";
import { weebCentralSource } from "@/sources/weebcentral/weebcentral-source";
import { zonaTmoSource } from "@/sources/zonatmo/zonatmo-source";
import { getEnabledExtensions, getExtensionSource, createMangaSourceFromExtension } from "@/lib/extensions";

const builtInSources = new Map<string, MangaSource>([
  [weebCentralSource.id, weebCentralSource],
  [zonaTmoSource.id, zonaTmoSource],
  [mangaPlusSource.id, mangaPlusSource],
  [webtoonSource.id, webtoonSource],
]);

let extensionSourcesLoaded = false;
let initializationPromise: Promise<void> | null = null;

async function loadExtensionSources(): Promise<void> {
  const extensions = getEnabledExtensions();

  for (const extension of extensions) {
    const source = await getExtensionSource(extension.manifest.id);
    if (source) {
      builtInSources.set(extension.manifest.sourceId, createMangaSourceFromExtension(extension, source));
    }
  }
}

export function getSource(id: string): MangaSource | undefined {
  return builtInSources.get(id);
}

export function listSources(): MangaSource[] {
  return [...builtInSources.values()];
}

export async function initializeExtensionSources(): Promise<void> {
  if (extensionSourcesLoaded) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    extensionSourcesLoaded = true;
    await loadExtensionSources();
  })();

  return initializationPromise;
}

export function refreshExtensionSources(): void {
  extensionSourcesLoaded = false;
  initializationPromise = null;
}