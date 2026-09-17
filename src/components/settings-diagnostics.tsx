'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import packageJson from '../../package.json';
import { getOfflineStorageEstimate } from '@/lib/offline/chapter-cache';
import { isInstalledPwa } from '@/lib/pwa/display-mode';
import { idbGetAll } from '@/lib/storage/idb';
import type { LibraryEntry } from '@/types/models';

type ProviderFreshness = {
  sourceId: string;
  titles: number;
  checked: number;
  lastCheckedAt: string | null;
};

type DiagnosticSnapshot = {
  version: string;
  online: boolean;
  installed: boolean;
  cacheBound: boolean;
  serviceWorker: string;
  storageUsage: number | null;
  storageQuota: number | null;
  pendingProgress: number;
  pendingSettings: number;
  providers: ProviderFreshness[];
};

function formatBytes(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'unavailable';
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[unit]}`;
}

function latestIso(current: string | null, candidate?: string) {
  if (!candidate) return current;
  const candidateTime = Date.parse(candidate);
  if (!Number.isFinite(candidateTime)) return current;
  if (!current) return candidate;
  const currentTime = Date.parse(current);
  return !Number.isFinite(currentTime) || candidateTime > currentTime ? candidate : current;
}

function aggregateProviderFreshness(entries: LibraryEntry[]) {
  const providers = new Map<string, ProviderFreshness>();
  for (const entry of entries) {
    const sourceId = entry.sourceId || entry.manga?.sourceId || 'unknown';
    const current = providers.get(sourceId) || { sourceId, titles: 0, checked: 0, lastCheckedAt: null };
    current.titles += 1;
    if (entry.lastCheckedAt) {
      current.checked += 1;
      current.lastCheckedAt = latestIso(current.lastCheckedAt, entry.lastCheckedAt);
    }
    providers.set(sourceId, current);
  }
  return [...providers.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

async function readServiceWorkerState() {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return 'not registered';
  const registration = registrations.find((value) => value.active || value.waiting || value.installing) || registrations[0];
  if (registration.waiting) return 'update waiting';
  if (registration.installing) return `installing (${registration.installing.state})`;
  if (registration.active) return `active (${registration.active.state})`;
  return navigator.serviceWorker.controller ? 'controlled' : 'registered';
}

async function collectDiagnostics(): Promise<DiagnosticSnapshot> {
  const [progress, settings, library, storage, serviceWorker] = await Promise.all([
    idbGetAll('outbox'),
    idbGetAll('settingsOutbox'),
    idbGetAll<LibraryEntry>('library'),
    getOfflineStorageEstimate().catch(() => null),
    readServiceWorkerState().catch(() => 'unavailable'),
  ]);

  let cacheBound = false;
  try {
    cacheBound = Boolean(localStorage.getItem('pachimanga:cache-owner'));
  } catch {
    // Storage can be unavailable in restrictive/private contexts.
  }

  return {
    version: packageJson.version,
    online: navigator.onLine,
    installed: isInstalledPwa(),
    cacheBound,
    serviceWorker,
    storageUsage: storage?.usage ?? null,
    storageQuota: storage?.quota ?? null,
    pendingProgress: progress.length,
    pendingSettings: settings.length,
    providers: aggregateProviderFreshness(library),
  };
}

function formatProviderLine(provider: ProviderFreshness) {
  const freshness = provider.lastCheckedAt
    ? new Date(provider.lastCheckedAt).toLocaleString()
    : 'never checked';
  return `${provider.sourceId}: ${provider.titles} title${provider.titles === 1 ? '' : 's'}, ${provider.checked} checked, latest ${freshness}`;
}

function diagnosticsText(snapshot: DiagnosticSnapshot) {
  const lines = [
    'Pachimanga diagnostics',
    `App version: ${snapshot.version}`,
    `Network: ${snapshot.online ? 'online' : 'offline'}`,
    `Display mode: ${snapshot.installed ? 'installed/standalone' : 'browser'}`,
    `Account cache: ${snapshot.cacheBound ? 'bound to signed-in account' : 'not bound'}`,
    `Sync queue: ${snapshot.pendingProgress} progress, ${snapshot.pendingSettings} settings pending`,
    `Service worker: ${snapshot.serviceWorker}`,
    `Site storage: ${formatBytes(snapshot.storageUsage)} used / ${formatBytes(snapshot.storageQuota)} quota`,
    'Provider freshness:',
    ...(snapshot.providers.length ? snapshot.providers.map((provider) => `- ${formatProviderLine(provider)}`) : ['- no cached library metadata']),
  ];
  return lines.join('\n');
}

export function SettingsDiagnostics() {
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSnapshot(await collectDiagnostics());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handle = () => void refresh();
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    window.addEventListener('pachimanga:sync-change', handle);
    window.addEventListener('pachimanga:library-change', handle);
    window.addEventListener('pachimanga:offline-cache-change', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
      window.removeEventListener('pachimanga:sync-change', handle);
      window.removeEventListener('pachimanga:library-change', handle);
      window.removeEventListener('pachimanga:offline-cache-change', handle);
    };
  }, [refresh]);

  const copy = useMemo(() => snapshot ? diagnosticsText(snapshot) : '', [snapshot]);

  async function copyDiagnostics() {
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  const pending = snapshot ? snapshot.pendingProgress + snapshot.pendingSettings : 0;

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="settings-diagnostics-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="pixel-kicker text-[9px] text-sky-300">Diagnostics</p>
          <h2 id="settings-diagnostics-title" className="mt-1 text-lg font-semibold text-zinc-100">Safe app diagnostics</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Useful app, sync, service-worker, storage, and provider-freshness status. Copied diagnostics never include account IDs, email addresses, tokens, relay secrets, provider cookies, or manga titles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={() => void copyDiagnostics()} disabled={!snapshot} className="button-primary px-4 py-2.5 text-sm disabled:opacity-50">
            Copy diagnostics
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
          <dt className="text-xs uppercase tracking-[.12em] text-zinc-600">App & session</dt>
          <dd className="mt-2 leading-6 text-zinc-300">v{snapshot?.version ?? packageJson.version} · {snapshot?.installed ? 'Installed' : 'Browser'} · {snapshot?.cacheBound ? 'Account cache bound' : 'Cache binding unavailable'}</dd>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
          <dt className="text-xs uppercase tracking-[.12em] text-zinc-600">Sync</dt>
          <dd className="mt-2 leading-6 text-zinc-300">{snapshot?.online === false ? 'Offline' : 'Online'} · {pending} pending ({snapshot?.pendingProgress ?? 0} progress, {snapshot?.pendingSettings ?? 0} settings)</dd>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
          <dt className="text-xs uppercase tracking-[.12em] text-zinc-600">Service worker</dt>
          <dd className="mt-2 leading-6 text-zinc-300">{snapshot?.serviceWorker ?? 'Checking…'}</dd>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
          <dt className="text-xs uppercase tracking-[.12em] text-zinc-600">Site storage</dt>
          <dd className="mt-2 leading-6 text-zinc-300">{snapshot ? `${formatBytes(snapshot.storageUsage)} / ${formatBytes(snapshot.storageQuota)}` : 'Checking…'}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
        <p className="text-xs uppercase tracking-[.12em] text-zinc-600">Provider freshness</p>
        {snapshot?.providers.length ? (
          <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-zinc-400">
            {snapshot.providers.map((provider) => <li key={provider.sourceId}>{formatProviderLine(provider)}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No cached provider freshness metadata is available yet.</p>
        )}
      </div>

      <p className="mt-4 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">
        {copyState === 'copied' ? 'Diagnostics copied.' : copyState === 'error' ? 'Copy failed. Your browser may block clipboard access.' : ''}
      </p>
    </section>
  );
}
