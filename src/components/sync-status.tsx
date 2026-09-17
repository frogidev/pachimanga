'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { idbGetAll } from '@/lib/storage/idb';

type SyncSnapshot = {
  online: boolean;
  pendingProgress: number;
  pendingSettings: number;
  lastSyncedAt: string | null;
};

const initialSnapshot: SyncSnapshot = {
  online: true,
  pendingProgress: 0,
  pendingSettings: 0,
  lastSyncedAt: null,
};

function lastSyncStorageKey() {
  if (typeof window === 'undefined') return null;
  const owner = localStorage.getItem('pachimanga:cache-owner');
  return owner ? `pachimanga:last-sync:${owner}` : null;
}

function readLastSyncedAt() {
  const key = lastSyncStorageKey();
  if (!key) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLastSyncedAt(value: string) {
  const key = lastSyncStorageKey();
  if (!key) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Session storage may be unavailable in restrictive/private contexts.
  }
}

async function readSyncSnapshot(): Promise<SyncSnapshot> {
  const [progress, settings] = await Promise.all([
    idbGetAll('outbox'),
    idbGetAll('settingsOutbox'),
  ]);
  return {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pendingProgress: progress.length,
    pendingSettings: settings.length,
    lastSyncedAt: readLastSyncedAt(),
  };
}

function formatRelative(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(time).toLocaleDateString();
}

function useSyncSnapshot() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const previousPending = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const next = await readSyncSnapshot();
    const pending = next.pendingProgress + next.pendingSettings;
    if (next.online && previousPending.current != null && previousPending.current > 0 && pending === 0) {
      const now = new Date().toISOString();
      writeLastSyncedAt(now);
      next.lastSyncedAt = now;
    }
    previousPending.current = pending;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    void refresh();
    const handle = () => void refresh();
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    window.addEventListener('pachimanga:history-change', handle);
    window.addEventListener('pachimanga:settings-change', handle);
    window.addEventListener('pachimanga:sync-change', handle);
    const interval = window.setInterval(handle, 15_000);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
      window.removeEventListener('pachimanga:history-change', handle);
      window.removeEventListener('pachimanga:settings-change', handle);
      window.removeEventListener('pachimanga:sync-change', handle);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return snapshot;
}

export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const snapshot = useSyncSnapshot();
  const pending = snapshot.pendingProgress + snapshot.pendingSettings;
  const label = !snapshot.online
    ? pending ? `Offline · ${pending} pending` : 'Offline'
    : pending
      ? `Syncing · ${pending} pending`
      : 'Synced';
  const dotClass = !snapshot.online
    ? 'bg-amber-300'
    : pending
      ? 'bg-sky-300'
      : 'bg-emerald-300';

  return (
    <span className={`inline-flex items-center gap-2 ${compact ? 'text-[10px]' : 'text-[11px]'} text-zinc-500`} aria-live="polite">
      <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function SyncStatusPanel() {
  const snapshot = useSyncSnapshot();
  const pending = snapshot.pendingProgress + snapshot.pendingSettings;
  const relative = formatRelative(snapshot.lastSyncedAt);
  const title = !snapshot.online ? 'Offline' : pending ? 'Changes waiting to sync' : 'Account data synchronized';
  const detail = !snapshot.online
    ? pending
      ? `${pending} change${pending === 1 ? '' : 's'} will retry when this device reconnects.`
      : 'Reading remains available only where data is already cached; new account operations need a connection.'
    : pending
      ? `${snapshot.pendingProgress} reading and ${snapshot.pendingSettings} settings change${pending === 1 ? '' : 's'} still pending.`
      : relative
        ? `No pending changes. Last queue flush completed ${relative}.`
        : 'No pending reading-progress or settings changes.';

  return (
    <section className="surface-card p-5 sm:p-6" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="pixel-kicker text-[9px] text-sky-300">Synchronization</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{detail}</p>
        </div>
        <SyncStatusIndicator />
      </div>
    </section>
  );
}
