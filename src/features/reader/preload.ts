import type { Page } from "@/types/models";

export function getPreloadWindow(
  pages: Page[],
  currentIndex: number,
  preloadCount = 2,
): Page[] {
  const start = Math.max(0, currentIndex + 1);
  return pages.slice(start, start + Math.max(0, preloadCount));
}
