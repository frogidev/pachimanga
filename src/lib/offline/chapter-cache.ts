import type { Page } from "@/types/models";

export const CHAPTER_CACHE = "pachimanga-chapters-v1";

function hasCacheApi() {
  return typeof window !== "undefined" && "caches" in window;
}

/** Pure: ordered unique page image URLs for a chapter. */
export function uniquePageUrls(pages: Pick<Page, "imageUrl">[]): string[] {
  const seen = new Set<string>();
  for (const page of pages) {
    const url = page.imageUrl?.trim();
    if (url && !seen.has(url)) seen.add(url);
  }
  return [...seen];
}

export async function getCachedChapterCount(urls: string[]): Promise<number> {
  if (!hasCacheApi() || urls.length === 0) return 0;
  try {
    const cache = await caches.open(CHAPTER_CACHE);
    const hits = await Promise.all(urls.map((url) => cache.match(url).then((hit) => (hit ? 1 : 0))));
    return hits.reduce<number>((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

/** Fetch every missing page into the chapter cache. Returns saved/total. */
export async function cacheChapterPages(
  urls: string[],
  onProgress?: (saved: number, total: number) => void,
): Promise<{ saved: number; total: number }> {
  const total = urls.length;
  if (!hasCacheApi() || total === 0) return { saved: 0, total };
  const cache = await caches.open(CHAPTER_CACHE);
  let saved = 0;
  for (const url of urls) {
    try {
      const hit = await cache.match(url);
      if (!hit) {
        // no-cors: opaque responses still render <img> and serve offline.
        const response = await fetch(url, { mode: "no-cors", credentials: "omit" });
        await cache.put(url, response);
      }
      saved += 1;
    } catch {
      // Single-page failure must not abort the chapter.
    }
    onProgress?.(saved, total);
  }
  return { saved, total };
}

export async function clearChapterCache(): Promise<void> {
  if (!hasCacheApi()) return;
  try {
    await caches.delete(CHAPTER_CACHE);
  } catch {
    // Cache already gone or unavailable.
  }
}
