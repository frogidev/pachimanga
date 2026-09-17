'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PageHeading } from '@/components/page-heading';
import { shouldRefreshLibrarySource } from '@/lib/library/library-state';
import { classifyProviderError, type ProviderErrorInfo } from '@/lib/source/provider-error';
import { isTauriNative } from '@/lib/native/tauri-bridge';

type AvailabilityItem = {
  sourceId: string;
  mangaId: string;
  title: string;
  addedAt: string;
  publicationStatus: string;
  chapterCount: number;
  latestChapterId: string | null;
  latestChapterNumber: number | null;
  latestChapterPublishedAt: string | null;
  newChapterCount: number;
  lastChapterChangeAt: string | null;
  lastCheckedAt: string | null;
};

type AvailabilityResponse = {
  items?: AvailabilityItem[];
  error?: string;
};

type RefreshResponse = {
  lastCheckedAt?: string;
  newChapterCount?: number;
  skipped?: boolean;
  reason?: string;
  error?: ProviderErrorInfo;
};

type RefreshSummary = {
  checked: number;
  failed: number;
  finishedAt: string;
};

function subscribeNative() {
  return () => {};
}

function providerLabel(sourceId: string) {
  if (sourceId === 'mangadex') return 'MangaDex';
  if (sourceId === 'weebcentral') return 'WeebCentral';
  if (sourceId === 'comick') return 'ComicK';
  if (sourceId === 'import') return 'Local import';
  return sourceId || 'Unknown source';
}

function formatCheckedAt(value?: string | null) {
  if (!value) return 'Never checked';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Check time unavailable';
  return new Date(time).toLocaleString();
}

function chapterSummary(entry: AvailabilityItem) {
  const count = Math.max(0, Number(entry.chapterCount || 0));
  const latest = Number(entry.latestChapterNumber);
  if (Number.isFinite(latest) && latest > 0) return `Ch. ${latest} · ${count} readable chapter${count === 1 ? '' : 's'}`;
  return `${count} readable chapter${count === 1 ? '' : 's'}`;
}

function entryHref(entry: AvailabilityItem, native: boolean) {
  if (entry.sourceId === 'import') return null;
  return native && entry.sourceId === 'weebcentral'
    ? `/native/manga/${entry.mangaId}`
    : `/manga/${entry.mangaId}`;
}

export function UpdatesView() {
  const [entries, setEntries] = useState<AvailabilityItem[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(() => new Set());
  const [accountError, setAccountError] = useState<string | null>(null);
  const [providerRunError, setProviderRunError] = useState<string | null>(null);
  const [failures, setFailures] = useState<Record<string, ProviderErrorInfo>>({});
  const [summary, setSummary] = useState<RefreshSummary | null>(null);
  const refreshRunning = useRef(false);
  const native = useSyncExternalStore(subscribeNative, isTauriNative, () => false);

  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/library/availability', { cache: 'no-store' });
      const body = await response.json() as AvailabilityResponse;
      if (!response.ok) throw new Error(body.error || `Account availability failed with HTTP ${response.status}`);
      const next = Array.isArray(body.items) ? body.items : [];
      setEntries(next);
      setAccountError(null);
      return next;
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not load the live account library.');
      throw error;
    }
  }, []);

  const refreshEntries = useCallback(async (current: AvailabilityItem[], force: boolean) => {
    if (refreshRunning.current) return;

    const candidates = current.filter((entry) =>
      entry.sourceId !== 'import'
      && entry.sourceId !== 'mock'
      && (force || shouldRefreshLibrarySource(entry.lastCheckedAt)),
    );
    if (!candidates.length) {
      setProviderRunError(null);
      setSummary({ checked: 0, failed: 0, finishedAt: new Date().toISOString() });
      return;
    }

    if (!navigator.onLine) {
      const offline = classifyProviderError(null, { offline: true });
      setFailures(Object.fromEntries(candidates.map((entry) => [entry.mangaId, offline])));
      setProviderRunError(offline.message);
      setSummary({ checked: 0, failed: candidates.length, finishedAt: new Date().toISOString() });
      return;
    }

    refreshRunning.current = true;
    setRefreshing(true);
    setCheckingIds(new Set(candidates.map((entry) => entry.mangaId)));
    setProviderRunError(null);
    const nextFailures: Record<string, ProviderErrorInfo> = {};
    let checked = 0;

    try {
      for (let index = 0; index < candidates.length; index += 2) {
        const chunk = candidates.slice(index, index + 2);
        await Promise.all(chunk.map(async (entry) => {
          try {
            const response = await fetch('/api/library/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mangaId: entry.mangaId }),
            });
            const body = await response.json() as RefreshResponse;
            if (!response.ok) {
              nextFailures[entry.mangaId] = body.error || classifyProviderError(`HTTP ${response.status}`);
              return;
            }
            checked += 1;
          } catch (error) {
            nextFailures[entry.mangaId] = classifyProviderError(error, { offline: !navigator.onLine });
          }
        }));
      }

      setFailures(nextFailures);
      setSummary({
        checked,
        failed: Object.keys(nextFailures).length,
        finishedAt: new Date().toISOString(),
      });
      await reload();
      window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
    } catch {
      setProviderRunError('Provider checks completed, but the live account snapshot could not be reloaded.');
    } finally {
      refreshRunning.current = false;
      setRefreshing(false);
      setCheckingIds(new Set());
    }
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const current = await reload();
        if (cancelled) return;
        setReady(true);
        void refreshEntries(current, false);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    const onLibraryChange = () => {
      void reload().catch(() => {
        // reload exposes the live account-load failure in UI state.
      });
    };
    window.addEventListener('pachimanga:library-change', onLibraryChange);
    return () => {
      cancelled = true;
      window.removeEventListener('pachimanga:library-change', onLibraryChange);
    };
  }, [refreshEntries, reload]);

  const sourceBacked = useMemo(
    () => entries.filter((entry) => entry.sourceId !== 'import' && entry.sourceId !== 'mock'),
    [entries],
  );
  const localOnly = entries.length - sourceBacked.length;
  const updateCount = sourceBacked.filter((entry) => Number(entry.newChapterCount || 0) > 0).length;
  const checkedCount = sourceBacked.filter((entry) => Boolean(entry.lastCheckedAt)).length;
  const accountSnapshotAvailable = ready && !accountError;
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => {
    const updates = Number(b.newChapterCount || 0) - Number(a.newChapterCount || 0);
    if (updates) return updates;
    return (b.lastCheckedAt || '').localeCompare(a.lastCheckedAt || '');
  }), [entries]);

  const metrics = [
    { label: 'Account titles', value: accountSnapshotAvailable ? entries.length : '—' },
    { label: 'Provider-backed', value: accountSnapshotAvailable ? sourceBacked.length : '—' },
    { label: 'Local/imported', value: accountSnapshotAvailable ? localOnly : '—' },
    { label: 'Checked', value: accountSnapshotAvailable ? checkedCount : '—' },
    { label: 'With updates', value: accountSnapshotAvailable ? updateCount : '—' },
  ];

  return (
    <div className="app-page max-w-6xl">
      <PageHeading
        eyebrow="Latest"
        title="Updates"
        subtitle="Live Supabase account state plus explicit provider checks. Stale provider-backed titles are checked once when this page opens; background polling remains disabled."
        actions={
          <button
            type="button"
            onClick={() => void refreshEntries(entries, true)}
            disabled={!accountSnapshotAvailable || refreshing || sourceBacked.length === 0}
            className="button-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Checking providers…' : 'Check all now'}
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Update availability summary">
        {metrics.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">{label}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {summary ? (
        <p className="mt-4 text-xs text-zinc-500" role="status" aria-live="polite">
          Last provider run: {summary.checked} checked, {summary.failed} failed · {formatCheckedAt(summary.finishedAt)}
        </p>
      ) : null}

      {accountError ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-300/15 bg-red-400/[.05] px-4 py-3 text-sm text-red-200/80 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{accountError}</span>
          <button type="button" onClick={() => void reload().catch(() => {})} className="button-secondary shrink-0 px-3 py-2 text-xs">Retry live account load</button>
        </div>
      ) : null}

      {providerRunError ? (
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-4 py-3 text-sm text-amber-100/80" role="status">
          {providerRunError}
        </div>
      ) : null}

      <section className="mt-7" aria-labelledby="provider-availability-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">Production data</p>
            <h2 id="provider-availability-heading" className="mt-1 text-xl font-bold tracking-[-.03em] text-white">Library availability</h2>
          </div>
          <span className="text-xs text-zinc-500">{accountSnapshotAvailable ? `${entries.length} account title${entries.length === 1 ? '' : 's'}` : ready ? 'Live account data unavailable' : 'Loading live account data…'}</span>
        </div>

        {!ready ? (
          <div className="mt-4 space-y-2" aria-label="Loading live library availability">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[.045]" />)}
          </div>
        ) : !accountSnapshotAvailable ? null : (
          <div className="surface-card mt-4 divide-y divide-white/[.055] overflow-hidden">
            {sortedEntries.length === 0 ? (
              <div className="px-5 py-5 text-sm text-zinc-400">
                <strong className="text-zinc-200">0 titles are stored in the live account library.</strong>
                <span className="ml-2">The production database returned no library rows for this account.</span>
              </div>
            ) : sortedEntries.map((entry) => {
              const href = entryHref(entry, native);
              const failure = failures[entry.mangaId];
              const newCount = Math.max(0, Number(entry.newChapterCount || 0));
              const neverChecked = entry.sourceId !== 'import' && !entry.lastCheckedAt;
              const checkingThisEntry = checkingIds.has(entry.mangaId);
              return (
                <div key={`${entry.sourceId}-${entry.mangaId}`} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className="font-semibold text-zinc-100 transition hover:text-pink-300">{entry.title || entry.mangaId}</Link>
                      ) : (
                        <span className="font-semibold text-zinc-100">{entry.title || entry.mangaId}</span>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-500">{providerLabel(entry.sourceId)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Availability</p>
                      <p className="mt-1 text-xs text-zinc-300">{entry.sourceId === 'import' ? 'Local metadata only' : chapterSummary(entry)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Last checked</p>
                      <p className="mt-1 text-xs text-zinc-300">{entry.sourceId === 'import' ? 'Not applicable' : formatCheckedAt(entry.lastCheckedAt)}</p>
                    </div>
                    <div className="sm:text-right">
                      {failure ? (
                        <span className="text-[11px] text-amber-200/80">check failed</span>
                      ) : newCount > 0 ? (
                        <span className="inline-flex rounded-full bg-pink-400/12 px-2.5 py-1 text-[11px] font-semibold text-pink-300">{newCount} new</span>
                      ) : entry.sourceId === 'import' ? (
                        <span className="text-[11px] text-zinc-600">local</span>
                      ) : checkingThisEntry ? (
                        <span className="text-[11px] text-sky-300/80">checking…</span>
                      ) : neverChecked ? (
                        <span className="text-[11px] text-zinc-500">unchecked</span>
                      ) : (
                        <span className="text-[11px] text-emerald-300/80">current</span>
                      )}
                    </div>
                  </div>
                  {failure ? (
                    <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[11px] leading-5 text-amber-100/80" role="status">
                      <strong>{failure.title}.</strong> {failure.message}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
