/** Pure offline-sync helpers (no browser or Supabase imports, unit-testable). */

/** Order queued progress oldest-first so last-write-wins on flush. */
export function sortOutboxByTime<T extends { updatedAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
}
