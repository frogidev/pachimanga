'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PageHeading } from '@/components/page-heading';
import { shouldRefreshLibrarySource } from '@/lib/library/library-state';
import { classifyProviderError, providerErrorText, type ProviderErrorInfo } from '@/lib/source/provider-error';
import { isTauriNative } from '@/lib/native/tauri-bridge';
import { useLocale } from '@/lib/i18n';
import { sourceDisplayName } from '@/lib/source-labels';

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


function formatCheckedAt(value: string | null | undefined, locale: string, t: (key: string) => string) {
  if (!value) return t("updates.never_checked");
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return t("updates.check_time_unavailable");
  return new Date(time).toLocaleString(locale);
}

function chapterSummary(entry: AvailabilityItem, t: (key: string, vars?: Record<string, string | number>) => string) {
  const count = Math.max(0, Number(entry.chapterCount || 0));
  const latest = Number(entry.latestChapterNumber);
  if (Number.isFinite(latest) && latest > 0) return t(count === 1 ? 'updates.latest_one' : 'updates.latest_other', { latest, count });
  return t(count === 1 ? 'updates.chapters_one' : 'updates.chapters_other', { count });
}

function entryHref(entry: AvailabilityItem, native: boolean) {
  if (entry.sourceId === 'import') return null;
  return native && entry.sourceId === 'weebcentral'
    ? `/native/manga/${entry.mangaId}`
    : `/manga/${entry.mangaId}`;
}

export function UpdatesView() {
  const { t, locale } = useLocale();
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
      if (!response.ok) throw new Error(body.error || t('updates.err.availability', { status: response.status }));
      const next = Array.isArray(body.items) ? body.items : [];
      setEntries(next);
      setAccountError(null);
      return next;
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : t("updates.err.load"));
      throw error;
    }
  }, [t]);

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
      setProviderRunError(providerErrorText(t, offline).message);
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
              body: JSON.stringify({ mangaId: entry.mangaId, sourceId: entry.sourceId }),
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
      setProviderRunError(t("updates.err.reload"));
    } finally {
      refreshRunning.current = false;
      setRefreshing(false);
      setCheckingIds(new Set());
    }
  }, [reload, t]);

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
    { label: t("updates.m.titles"), value: accountSnapshotAvailable ? entries.length : '—' },
    { label: t("updates.m.provider"), value: accountSnapshotAvailable ? sourceBacked.length : '—' },
    { label: t("updates.m.local"), value: accountSnapshotAvailable ? localOnly : '—' },
    { label: t("updates.m.checked"), value: accountSnapshotAvailable ? checkedCount : '—' },
    { label: t("updates.m.with_updates"), value: accountSnapshotAvailable ? updateCount : '—' },
  ];

  return (
    <div className="app-page max-w-6xl">
      <PageHeading
        eyebrow={t("updates.kicker")}
        title={t("updates.title")}
        subtitle={t("updates.subtitle")}
        actions={
          <button
            type="button"
            onClick={() => void refreshEntries(entries, true)}
            disabled={!accountSnapshotAvailable || refreshing || sourceBacked.length === 0}
            className="button-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? t("updates.checking_providers") : t("updates.check_all")}
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label={t("updates.summary_aria")}>
        {metrics.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[.16em] text-zinc-600">{label}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {summary ? (
        <p className="mt-4 text-xs text-zinc-500" role="status" aria-live="polite">
          {t("updates.last_run", { checked: summary.checked, failed: summary.failed })} · {formatCheckedAt(summary.finishedAt, locale, t)}
        </p>
      ) : null}

      {accountError ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-300/15 bg-red-400/[.05] px-4 py-3 text-sm text-red-200/80 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{accountError}</span>
          <button type="button" onClick={() => void reload().catch(() => {})} className="button-secondary shrink-0 px-3 py-2 text-xs">{t("updates.retry_load")}</button>
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
            <p className="pixel-kicker text-[9px] text-pink-400">{t("updates.production")}</p>
            <h2 id="provider-availability-heading" className="mt-1 text-xl font-bold tracking-[-.03em] text-white">{t("updates.availability")}</h2>
          </div>
          <span className="text-xs text-zinc-500">{accountSnapshotAvailable ? t(entries.length === 1 ? 'updates.account_titles_one' : 'updates.account_titles_other', { count: entries.length }) : ready ? t("updates.unavailable") : t("updates.loading_data")}</span>
        </div>

        {!ready ? (
          <div className="mt-4 space-y-2" aria-label={t("updates.loading_aria")}>
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[.045]" />)}
          </div>
        ) : !accountSnapshotAvailable ? null : (
          <div className="surface-card mt-4 divide-y divide-white/[.055] overflow-hidden">
            {sortedEntries.length === 0 ? (
              <div className="px-5 py-5 text-sm text-zinc-400">
                <strong className="text-zinc-200">{t("updates.empty")}</strong>
                <span className="ml-2">{t("updates.empty_sub")}</span>
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
                      <p className="mt-1 text-[11px] text-zinc-500">{sourceDisplayName(entry.sourceId) ?? (entry.sourceId || t("updates.unknown_source"))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{t("updates.col_availability")}</p>
                      <p className="mt-1 text-xs text-zinc-300">{entry.sourceId === 'import' ? t("updates.local_only") : chapterSummary(entry, t)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{t("updates.last_checked")}</p>
                      <p className="mt-1 text-xs text-zinc-300">{entry.sourceId === 'import' ? t("updates.not_applicable") : formatCheckedAt(entry.lastCheckedAt, locale, t)}</p>
                    </div>
                    <div className="sm:text-right">
                      {failure ? (
                        <span className="text-[11px] text-amber-200/80">{t("updates.check_failed")}</span>
                      ) : newCount > 0 ? (
                        <span className="inline-flex rounded-full bg-pink-400/12 px-2.5 py-1 text-[11px] font-semibold text-pink-300">{t("updates.new_count", { count: newCount })}</span>
                      ) : entry.sourceId === 'import' ? (
                        <span className="text-[11px] text-zinc-600">{t("updates.local")}</span>
                      ) : checkingThisEntry ? (
                        <span className="text-[11px] text-sky-300/80">{t("updates.checking")}</span>
                      ) : neverChecked ? (
                        <span className="text-[11px] text-zinc-500">{t("updates.unchecked")}</span>
                      ) : (
                        <span className="text-[11px] text-emerald-300/80">{t("updates.current")}</span>
                      )}
                    </div>
                  </div>
                  {failure ? (
                    <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[11px] leading-5 text-amber-100/80" role="status">
                      <strong>{providerErrorText(t, failure).title}.</strong> {providerErrorText(t, failure).message}
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
