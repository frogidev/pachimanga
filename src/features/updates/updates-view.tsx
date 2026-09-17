'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PageHeading } from '@/components/page-heading';
import { shouldRefreshLibrarySource } from '@/lib/library/library-state';
import { classifyProviderError, type ProviderErrorInfo } from '@/lib/source/provider-error';
import { isTauriNative } from '@/lib/native/tauri-bridge';
import { getLibraryDashboardEntries } from '@/lib/storage/library-dashboard';
import type { LibraryEntry } from '@/types/models';

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

function formatCheckedAt(value?: string) {
  if (!value) return 'Never checked';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Check time unavailable';
  return new Date(time).toLocaleString();
}

function chapterSummary(entry: LibraryEntry) {
  const count = Math.max(0, Number(entry.chapterCount || 0));
  const latest = Number(entry.latestChapterNumber);
  if (Number.isFinite(latest) && latest > 0) return `Ch. ${latest} · ${count} readable chapter${count === 1 ? '' : 's'}`;
  return `${count} readable chapter${count === 1 ? '' : 's'}`;
}

function entryHref(entry: LibraryEntry, native: boolean) {
  if (entry.sourceId === 'import') return null;
  return native && entry.sourceId === 'weebcentral'
    ? `/native/manga/${entry.mangaId}`
    : `/manga/${entry.mangaId}`;
}

export function UpdatesView() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failures, setFailures] = useState<Record<string, ProviderErrorInfo>>({});
  const [summary, setSummary] = useState<RefreshSummary | null>(null);
  const refreshRunning = useRef(false);
  const native = useSyncExternalStore(subscribeNative, isTauriNative, () => false);

  const reload = useCallback(async () => {
    const next = await getLibraryDashboardEntries();
    setEntries(next);
    return next;
  }, []);

  const refreshEntries = useCallback(async (current: LibraryEntry[], force: boolean) => {
    if (refreshRunning.current) return;

    const candidates = current.filter((entry) =>
      entry.sourceId !== 'import'
      && entry.sourceId !== 'mock'
      && (force || shouldRefreshLibrarySource(entry.lastCheckedAt)),
    );
    if (!candidates.length) {
      setSummary({ checked: 0, failed: 0, finishedAt: new Date().toISOString() });
      return;
    }

    if (!navigator.onLine) {
      const offline = classifyProviderError(null, { offline: true });
      setFailures(Object.fromEntries(candidates.map((entry) => [entry.mangaId, offline])));
      setLoadError(offline.message);
      setSummary({ checked: 0, failed: candidates.length, finishedAt: new Date().toISOString() });
      return;
    }

    refreshRunning.current = true;
    setRefreshing(true);
    setLoadError(null);
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
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not reload library state after provider checks.');
    } finally {
      refreshRunning.current = false;
      setRefreshing(false);
    }
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const current = await getLibraryDashboardEntries();
        if (cancelled) return;
        setEntries(current);
        setLoadError(null);
        setReady(true);
        void refreshEntries(current, false);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load the signed-in library.');
        setReady(true);
      }
    })();

    const onLibraryChange = () => {
      void reload().catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not reload the signed-in library.');
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
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => {
    const updates = Number(b.newChapterCount || 0) - Number(a.newChapterCount || 0);
    if (updates) return updates;
    return (b.lastCheckedAt || '').localeCompare(a.lastCheckedAt || '');
  }), [entries]);

  return (
    <div className="app-page max-w-6xl">
      <PageHeading
        eyebrow="Latest"
        title="Updates"
        subtitle="Live account and provider state. Stale provider-backed titles are checked once when this page opens; background polling remains disabled."
        actions={
          <button
            type="button"
            onClick={() => void refreshEntries(entries, true)}
            disabled={!ready || refreshing || sourceBacked.length === 0}
            className="button-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Checking providers…' : 'Check all now'}
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Update availability summary">
        {[
          ['Account titles', entries.length],
          ['Provider-backed', sourceBacked.length],
          ['Local/imported', localOnly],
          ['Checked', checkedCount],
          ['With updates', updateCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3">
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

      {loadError ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-300/15 bg-red-400/[.05] px-4 py-3 text-sm text-red-200/80 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void reload()} className="button-secondary shrink-0 px-3 py-2 text-xs">Retry account load</button>
        </div>
      ) : null}

      <section className="mt-7" aria-labelledby="provider-availability-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">Production data</p>
            <h2 id="provider-availability-heading" className="mt-1 text-xl font-bold tracking-[-.03em] text-white">Library availability</h2>
          </div>
          <span className="text-xs text-zinc-500">{ready ? `${entries.length} account title${entries.length === 1 ? '' : 's'}` : 'Loading account data…'}</span>
        </div>

        {!ready ? (
          <div className="mt-4 space-y-2" aria-label="Loading library availability">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[.045]" />)}
          </div>
        ) : (
          <div className="surface-card mt-4 divide-y divide-white/[.055] overflow-hidden">
            {sortedEntries.length === 0 ? (
              <div className="px-5 py-5 text-sm text-zinc-400">
                <strong className="text-zinc-200">0 titles are stored in this account.</strong>
                <span className="ml-2">There is no library data to test against providers yet.</span>
              </div>
            ) : sortedEntries.map((entry) => {
              const href = entryHref(entry, native);
              const failure = failures[entry.mangaId];
              const newCount = Math.max(0, Number(entry.newChapterCount || 0));
              const title = entry.manga?.title || entry.mangaId;
              return (
                <div key={`${entry.sourceId}-${entry.mangaId}`} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className="font-semibold text-zinc-100 transition hover:text-pink-300">{title}</Link>
                      ) : (
                        <span className="font-semibold text-zinc-100">{title}</span>
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
                      {newCount > 0 ? (
                        <span className="inline-flex rounded-full bg-pink-400/12 px-2.5 py-1 text-[11px] font-semibold text-pink-300">{newCount} new</span>
                      ) : entry.sourceId === 'import' ? (
                        <span className="text-[11px] text-zinc-600">local</span>
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
