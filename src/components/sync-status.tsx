'use client';

import { useState, useSyncExternalStore } from 'react';
import { idbCount } from '@/lib/storage/idb';
import { flushLibraryOutbox, flushProgressOutbox, flushSettingsOutbox } from '@/lib/storage/reader-storage';
import { useLocale } from "@/lib/i18n";

type SyncSnapshot = {
  online: boolean;
  pendingLibrary: number;
  pendingProgress: number;
  pendingSettings: number;
  lastSyncedAt: string | null;
};

type SyncActionState =
  | { kind: 'idle'; message: '' }
  | { kind: 'running'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

const initialSnapshot: SyncSnapshot = {
  online: true,
  pendingLibrary: 0,
  pendingProgress: 0,
  pendingSettings: 0,
  lastSyncedAt: null,
};

let currentSnapshot = initialSnapshot;
let previousPending: number | null = null;
let refreshPromise: Promise<void> | null = null;
let intervalId: number | null = null;
let initialTimerId: number | null = null;
const snapshotListeners = new Set<() => void>();

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
  const [pendingLibrary, pendingProgress, pendingSettings] = await Promise.all([
    idbCount('libraryOutbox'),
    idbCount('outbox'),
    idbCount('settingsOutbox'),
  ]);
  return {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pendingLibrary,
    pendingProgress,
    pendingSettings,
    lastSyncedAt: readLastSyncedAt(),
  };
}

function snapshotsEqual(a: SyncSnapshot, b: SyncSnapshot) {
  return a.online === b.online
    && a.pendingLibrary === b.pendingLibrary
    && a.pendingProgress === b.pendingProgress
    && a.pendingSettings === b.pendingSettings
    && a.lastSyncedAt === b.lastSyncedAt;
}

function publishSnapshot(next: SyncSnapshot) {
  if (snapshotsEqual(currentSnapshot, next)) return;
  currentSnapshot = next;
  snapshotListeners.forEach((listener) => listener());
}

function refreshSyncSnapshot() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = readSyncSnapshot()
    .then((next) => {
      const pending = next.pendingLibrary + next.pendingProgress + next.pendingSettings;
      if (next.online && previousPending != null && previousPending > 0 && pending === 0) {
        const now = new Date().toISOString();
        writeLastSyncedAt(now);
        next.lastSyncedAt = now;
      }
      previousPending = pending;
      publishSnapshot(next);
    })
    .catch(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function handleSyncSignal() {
  void refreshSyncSnapshot();
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') handleSyncSignal();
}

function startSyncObserver() {
  if (typeof window === 'undefined' || intervalId !== null) return;
  currentSnapshot = {
    ...initialSnapshot,
    online: navigator.onLine,
    lastSyncedAt: readLastSyncedAt(),
  };
  previousPending = null;
  initialTimerId = window.setTimeout(handleSyncSignal, 0);
  window.addEventListener('online', handleSyncSignal);
  window.addEventListener('offline', handleSyncSignal);
  window.addEventListener('pachimanga:history-change', handleSyncSignal);
  window.addEventListener('pachimanga:settings-change', handleSyncSignal);
  window.addEventListener('pachimanga:sync-change', handleSyncSignal);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  intervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') handleSyncSignal();
  }, 15_000);
}

function stopSyncObserver() {
  if (typeof window === 'undefined') return;
  if (initialTimerId !== null) window.clearTimeout(initialTimerId);
  if (intervalId !== null) window.clearInterval(intervalId);
  initialTimerId = null;
  intervalId = null;
  window.removeEventListener('online', handleSyncSignal);
  window.removeEventListener('offline', handleSyncSignal);
  window.removeEventListener('pachimanga:history-change', handleSyncSignal);
  window.removeEventListener('pachimanga:settings-change', handleSyncSignal);
  window.removeEventListener('pachimanga:sync-change', handleSyncSignal);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  previousPending = null;
}

function subscribeSyncSnapshot(listener: () => void) {
  snapshotListeners.add(listener);
  if (snapshotListeners.size === 1) startSyncObserver();
  return () => {
    snapshotListeners.delete(listener);
    if (snapshotListeners.size === 0) stopSyncObserver();
  };
}

function getSyncSnapshot() {
  return currentSnapshot;
}

function getServerSyncSnapshot() {
  return initialSnapshot;
}

function formatRelative(value: string | null, locale: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return t('sync.just_now');
  if (seconds < 60) return t('sync.seconds_ago', { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('sync.minutes_ago', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('sync.hours_ago', { n: hours });
  return new Date(time).toLocaleDateString(locale);
}

function useSyncSnapshot() {
  return useSyncExternalStore(subscribeSyncSnapshot, getSyncSnapshot, getServerSyncSnapshot);
}

export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const snapshot = useSyncSnapshot();
  const { t } = useLocale();
  const pending = snapshot.pendingLibrary + snapshot.pendingProgress + snapshot.pendingSettings;
  const label = !snapshot.online
    ? pending ? t('sync.offline_pending', { pending }) : t('sync.offline')
    : pending
      ? t('sync.syncing_pending', { pending })
      : t('sync.synced');
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
  const { t, locale } = useLocale();
  const snapshot = useSyncSnapshot();
  const [action, setAction] = useState<SyncActionState>({ kind: 'idle', message: '' });
  const pending = snapshot.pendingLibrary + snapshot.pendingProgress + snapshot.pendingSettings;
  const relative = formatRelative(snapshot.lastSyncedAt, locale, t);
  const title = !snapshot.online ? t('sync.offline') : pending ? t('sync.waiting') : t('sync.all_synced');
  const detail = !snapshot.online
    ? pending
      ? t(pending === 1 ? 'sync.retry_one' : 'sync.retry_other', { count: pending })
      : t('sync.offline_note')
    : pending
      ? t(pending === 1 ? 'sync.pending_detail_one' : 'sync.pending_detail_other', { library: snapshot.pendingLibrary, progress: snapshot.pendingProgress, settings: snapshot.pendingSettings })
      : relative
        ? t('sync.last_flush', { when: relative })
        : t('sync.none_pending');

  async function runSync(label: string) {
    if (!snapshot.online || action.kind === 'running') return;
    setAction({ kind: 'running', message: `${label}…` });
    try {
      const [libraryResult, progressResult, settingsResult] = await Promise.all([
        flushLibraryOutbox(),
        flushProgressOutbox(),
        flushSettingsOutbox(),
      ]);
      const remaining = libraryResult.pending + progressResult.pending + settingsResult.pending;
      const synced = libraryResult.synced + progressResult.synced + settingsResult.synced;
      if (remaining > 0) {
        setAction({
          kind: 'pending',
          message: t(synced === 1 ? 'sync.partial_one' : 'sync.partial_other', { synced, remaining }),
        });
      } else {
        const now = new Date().toISOString();
        writeLastSyncedAt(now);
        setAction({
          kind: 'success',
          message: synced > 0 ? t(synced === 1 ? 'sync.done_one' : 'sync.done_other', { synced }) : t('sync.check_complete'),
        });
      }
    } catch {
      setAction({ kind: 'error', message: t('sync.failed') });
    } finally {
      window.dispatchEvent(new CustomEvent('pachimanga:sync-change'));
    }
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="settings-sync-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="pixel-kicker text-[9px] text-sky-300">{t('sync.kicker')}</p>
          <h2 id="settings-sync-title" className="mt-1 text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{detail}</p>
        </div>
        <SyncStatusIndicator />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runSync(t('sync.running'))}
          disabled={!snapshot.online || action.kind === 'running'}
          className="button-primary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {action.kind === 'running' ? `${t('sync.running')}…` : t('sync.now')}
        </button>
        {pending > 0 ? (
          <button
            type="button"
            onClick={() => void runSync(t('sync.retrying'))}
            disabled={!snapshot.online || action.kind === 'running'}
            className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {t('sync.retry_pending')}
          </button>
        ) : null}
      </div>
      {!snapshot.online ? <p className="mt-3 text-xs text-amber-300/80">{t('sync.reconnect')}</p> : null}
      <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">{action.message}</p>
    </section>
  );
}
