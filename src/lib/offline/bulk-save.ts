import type { Chapter, Manga } from "@/types/models";
import { cacheChapterPages, listOfflineChapters, rememberOfflineChapter, uniquePageUrls } from "./chapter-cache";

const PAUSE_MS = 350; // gentle on providers: chapters are fetched one at a time

export type BulkSaveProgress = { done: number; total: number; current: string; failed: number };
export type BulkSaveResult = { saved: number; skipped: number; failed: number; stoppedReason?: "cancelled" | "storage" };

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { window.clearTimeout(timer); resolve(); }, { once: true });
  });
}

/** Saves every chapter of a title for offline reading, skipping chapters that are already complete. */
export async function saveAllChaptersOffline(
  manga: Pick<Manga, "id" | "title" | "sourceId">,
  chapters: Chapter[],
  onProgress: (progress: BulkSaveProgress) => void,
  signal: AbortSignal,
): Promise<BulkSaveResult> {
  const existing = new Map((await listOfflineChapters()).filter((row) => row.mangaId === manga.id).map((row) => [row.chapterId, row]));
  const queue = chapters.filter((chapter) => {
    const row = existing.get(chapter.id);
    return !(row && row.total > 0 && row.savedCount >= row.total);
  });
  const result: BulkSaveResult = { saved: 0, skipped: chapters.length - queue.length, failed: 0 };

  for (const chapter of queue) {
    if (signal.aborted) return { ...result, stoppedReason: "cancelled" };
    onProgress({ done: result.saved + result.failed, total: queue.length, current: chapter.title, failed: result.failed });
    try {
      const response = await fetch(`/api/source/pages?source=${encodeURIComponent(manga.sourceId)}&chapterId=${encodeURIComponent(chapter.id)}`, { cache: "no-store", signal });
      const body = await response.json() as { pages?: Array<{ imageUrl: string }> };
      const urls = uniquePageUrls(body.pages ?? []);
      if (!response.ok || urls.length === 0) throw new Error("pages");
      const saved = await cacheChapterPages(urls, undefined, { signal });
      await rememberOfflineChapter({ mangaId: manga.id, mangaTitle: manga.title, chapterId: chapter.id, chapterTitle: chapter.title, urls, savedCount: saved.saved, total: saved.total });
      if (saved.failed === 0) result.saved += 1;
      else result.failed += 1;
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === "AbortError")) return { ...result, stoppedReason: "cancelled" };
      // cacheChapterPages refuses to continue when browser storage is nearly full.
      if (error instanceof Error && /storage/i.test(error.message)) return { ...result, stoppedReason: "storage" };
      result.failed += 1;
    }
    window.dispatchEvent(new CustomEvent("pachimanga:offline-cache-change"));
    await sleep(PAUSE_MS, signal);
  }
  onProgress({ done: result.saved + result.failed, total: queue.length, current: "", failed: result.failed });
  return result;
}
