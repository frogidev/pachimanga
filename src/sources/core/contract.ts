import type { MangaSource } from "./manga-source";

export function hasMangaSourceShape(value: unknown): value is MangaSource {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<keyof MangaSource, unknown>>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.search === "function" &&
    typeof candidate.getManga === "function" &&
    typeof candidate.getChapters === "function" &&
    typeof candidate.getChapterPages === "function"
  );
}
