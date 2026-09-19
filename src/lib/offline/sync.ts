/** Pure offline-sync helpers (no browser or Supabase imports, unit-testable). */

/** IndexedDB stores that contain authenticated account-owned state. */
export const ACCOUNT_BOUND_IDB_STORES = ["library", "progress", "history", "outbox", "settingsOutbox", "libraryOutbox", "offlineChapters"] as const;

/** Stores cleared by the user-facing "clear library" action. Reader settings are intentionally preserved. */
export const LIBRARY_CONTENT_IDB_STORES = ["library", "progress", "history", "outbox", "libraryOutbox"] as const;

/** Order queued progress oldest-first so last-write-wins on flush. */
export function sortOutboxByTime<T extends { updatedAt: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
}

/** True only when left contains a valid timestamp strictly newer than right. */
export function isStrictlyNewerTimestamp(left: string, right?: string | null) {
  const leftTime = Date.parse(left);
  const rightTime = right ? Date.parse(right) : Number.NaN;
  if (Number.isNaN(leftTime)) return false;
  if (Number.isNaN(rightTime)) return true;
  return leftTime > rightTime;
}

/**
 * Select the newest timestamped value. Remote wins ties so an acknowledged server
 * write can replace an equivalent cached value without creating oscillation.
 */
export function newestByUpdatedAt<T extends { updatedAt: string }>(local?: T, remote?: T): T | undefined {
  if (!local) return remote;
  if (!remote) return local;

  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);

  if (Number.isNaN(localTime)) return remote;
  if (Number.isNaN(remoteTime)) return local;
  return localTime > remoteTime ? local : remote;
}

/**
 * Keep only queue entries that are explicitly owned by the active account.
 * Legacy/unowned entries cannot be attributed safely and are treated as stale.
 */
export function splitOutboxByUser<T extends { userId?: string }>(entries: T[], userId: string) {
  const owned: T[] = [];
  const stale: T[] = [];

  for (const entry of entries) {
    if (entry.userId === userId) owned.push(entry);
    else stale.push(entry);
  }

  return { owned, stale };
}
