import type { MangaSource } from "@/sources/core/manga-source";
import { comickSource } from "@/sources/comick/comick-source";
import { mangaDexSource } from "@/sources/mangadex/mangadex-source";
import { weebCentralSource } from "@/sources/weebcentral/weebcentral-source";

const sourceRegistry = new Map<string, MangaSource>([
  [weebCentralSource.id, weebCentralSource],
  [mangaDexSource.id, mangaDexSource],
  [comickSource.id, comickSource],
]);

export function getSource(id: string): MangaSource | undefined {
  return sourceRegistry.get(id);
}

export function listSources(): MangaSource[] {
  return [...sourceRegistry.values()];
}
