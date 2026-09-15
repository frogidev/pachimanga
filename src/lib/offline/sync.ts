/** Pure offline-sync helpers (no browser or Supabase imports, unit-testable). */

/** IndexedDB stores that contain authenticated account-owned state. */
export const ACCOUNT_BOUND_IDB_STORES = ["library", "progress", "history", "outbox"] as const;

/** Order queued progress oldest-first so last-write-wins on flush. */
export function sortOutboxByTime<T extends { updatedAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
}

/** Keep only queue entries explicitly owned by the active account. Legacy/unowned entries are stale. */
export function splitOutboxByUser<T extends { userId?: string }>(entries: T[], userId: string) {
  return {
    owned: entries.filter((entry) => entry.userId === userId),
    stale: entries.filter((entry) => entry.userId !== userId),
  };
}

/** Prefer the newer timestamped record while keeping local state when timestamps are tied. */
export function newestByUpdatedAt<T extends { updatedAt: string }>(local?: T, remote?: T): T | undefined {
  if (!local) return remote;
  if (!remote) return local;
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  if (!Number.isFinite(remoteTime)) return local;
  if (!Number.isFinite(localTime)) return remote;
  return remoteTime > localTime ? remote : local;
}
