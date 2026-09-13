import type { MangaSource } from "@/sources/core/manga-source";
import { mockSource } from "@/sources/mock/mock-source";
import { weebCentralSource } from "@/sources/weebcentral/weebcentral-source";

const sourceRegistry = new Map<string, MangaSource>([
  [mockSource.id, mockSource],
  [weebCentralSource.id, weebCentralSource],
]);

export function getSource(id: string): MangaSource | undefined {
  return sourceRegistry.get(id);
}

export function listSources(): MangaSource[] {
  return [...sourceRegistry.values()];
}
