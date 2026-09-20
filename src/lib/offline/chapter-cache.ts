import type { Page } from "@/types/models";

export const CHAPTER_CACHE = "pachimanga-chapters-v1";
const CHAPTER_CACHE_OWNER_KEY = "pachimanga:chapter-cache-owner";

export type OfflineChapterRecord = {
  key: string;
  userId: string;
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterTitle: string;
  urls: string[];
  savedCount: number;
  total: number;
  updatedAt: string;
};

function hasCacheApi() {
  return typeof window !== "undefined" && "caches" in window;
}

export function uniquePageUrls(pages: Pick<Page, "imageUrl">[]): string[] {
  const seen = new Set<string>();
  for (const page of pages) {
    const url = page.imageUrl?.trim();
    if (url && !seen.has(url)) seen.add(url);
  }
  return [...seen];
}

export async function bindChapterCacheOwner(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;
  const current = localStorage.getItem(CHAPTER_CACHE_OWNER_KEY);
  if (current === userId) return;
  if (hasCacheApi()) {
    try { await caches.delete(CHAPTER_CACHE); } catch { /* restricted mode */ }
  }
  const { idbClear } = await import("@/lib/storage/idb");
  await idbClear("offlineChapters");
  localStorage.setItem(CHAPTER_CACHE_OWNER_KEY, userId);
}

export async function getCachedChapterCount(urls: string[]): Promise<number> {
  if (!hasCacheApi() || urls.length === 0) return 0;
  try {
    const cache = await caches.open(CHAPTER_CACHE);
    const hits = await Promise.all(urls.map((url) => cache.match(url).then((hit) => (hit ? 1 : 0))));
    return hits.reduce<number>((a, b) => a + b, 0);
  } catch { return 0; }
}

export async function getOfflineStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: Number(estimate.usage || 0), quota: Number(estimate.quota || 0) };
  } catch { return null; }
}

export async function cacheChapterPages(
  urls: string[],
  onProgress?: (saved: number, total: number) => void,
  options: { signal?: AbortSignal } = {},
): Promise<{ saved: number; total: number; failed: number }> {
  const total = urls.length;
  if (!hasCacheApi() || total === 0) return { saved: 0, total, failed: total };
  const estimate = await getOfflineStorageEstimate();
  if (estimate?.quota) {
    const remaining = Math.max(0, estimate.quota - estimate.usage);
    if (remaining < 16 * 1024 * 1024 || estimate.usage / estimate.quota >= 0.9) {
      throw new Error("Not enough browser storage is available to safely save another chapter offline.");
    }
  }
  const cache = await caches.open(CHAPTER_CACHE);
  let saved = 0;
  let failed = 0;
  for (const url of urls) {
    if (options.signal?.aborted) throw new DOMException("Offline chapter save cancelled.", "AbortError");
    try {
      const hit = await cache.match(url);
      if (!hit) {
        const response = await fetch(url, { mode: "no-cors", credentials: "omit", signal: options.signal });
        await cache.put(url, response);
      }
      saved += 1;
    } catch (error) {
      if (options.signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
      failed += 1;
    }
    onProgress?.(saved, total);
  }
  return { saved, total, failed };
}

export async function removeChapterPages(urls: string[]): Promise<void> {
  if (!hasCacheApi() || urls.length === 0) return;
  try {
    const cache = await caches.open(CHAPTER_CACHE);
    await Promise.all(urls.map((url) => cache.delete(url)));
  } catch { /* already unavailable */ }
}

export async function listOfflineChapters(): Promise<OfflineChapterRecord[]> {
  if (typeof window === "undefined") return [];
  const owner = localStorage.getItem(CHAPTER_CACHE_OWNER_KEY);
  if (!owner) return [];
  const { idbGetAll } = await import("@/lib/storage/idb");
  const rows = await idbGetAll<OfflineChapterRecord>("offlineChapters");
  return rows.filter((row) => row.userId === owner).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function rememberOfflineChapter(input: Omit<OfflineChapterRecord, "key" | "userId" | "updatedAt">) {
  if (typeof window === "undefined") return;
  const userId = localStorage.getItem(CHAPTER_CACHE_OWNER_KEY);
  if (!userId) return;
  const record: OfflineChapterRecord = { ...input, key: `${input.mangaId}:${input.chapterId}`, userId, updatedAt: new Date().toISOString() };
  const { idbPut } = await import("@/lib/storage/idb");
  await idbPut("offlineChapters", record as unknown as Record<string, unknown>);
}

export async function forgetOfflineChapter(mangaId: string, chapterId: string) {
  const { idbDelete } = await import("@/lib/storage/idb");
  await idbDelete("offlineChapters", `${mangaId}:${chapterId}`);
}

export async function removeOfflineChapter(record: OfflineChapterRecord) {
  await removeChapterPages(record.urls);
  const { idbDelete } = await import("@/lib/storage/idb");
  await idbDelete("offlineChapters", record.key);
}

export async function retryOfflineChapter(record: OfflineChapterRecord) {
  const result = await cacheChapterPages(record.urls);
  await rememberOfflineChapter({ mangaId: record.mangaId, mangaTitle: record.mangaTitle, chapterId: record.chapterId, chapterTitle: record.chapterTitle, urls: record.urls, savedCount: result.saved, total: result.total });
  return result;
}

export async function clearChapterCache(): Promise<void> {
  if (typeof window !== "undefined") localStorage.removeItem(CHAPTER_CACHE_OWNER_KEY);
  const { idbClear } = await import("@/lib/storage/idb");
  await idbClear("offlineChapters");
  if (!hasCacheApi()) return;
  try { await caches.delete(CHAPTER_CACHE); } catch { /* already gone */ }
}
