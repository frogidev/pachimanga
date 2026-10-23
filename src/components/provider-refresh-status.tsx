'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { classifyProviderError, providerErrorText, type ProviderErrorInfo } from '@/lib/source/provider-error';
import { getLibraryEntries } from '@/lib/storage/reader-storage';
import { useLocale } from "@/lib/i18n";

type RefreshResponse = {
  lastCheckedAt?: string;
  newChapterCount?: number;
  skipped?: boolean;
  reason?: string;
  reasonCode?: string;
  error?: ProviderErrorInfo;
};

function formatCheckedAt(value: string | null, locale: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!value) return t("refresh.never");
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return t("refresh.time_unavailable");
  return t("refresh.last_checked", { time: new Date(time).toLocaleString(locale) });
}

export function ProviderRefreshStatus({ mangaId, sourceId }: { mangaId: string; sourceId: string }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [inLibrary, setInLibrary] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<ProviderErrorInfo | { kind: 'success'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getLibraryEntries().then((entries) => {
        if (cancelled) return;
        const entry = entries.find((item) => item.mangaId === mangaId);
        setInLibrary(Boolean(entry));
        setLastCheckedAt(entry?.lastCheckedAt || null);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mangaId]);

  if (!inLibrary || sourceId === 'import' || sourceId === 'mock') return null;

  async function refresh() {
    if (refreshing) return;
    if (!navigator.onLine) {
      setResult(classifyProviderError(null, { offline: true }));
      return;
    }

    setRefreshing(true);
    setResult(null);
    try {
      const response = await fetch('/api/library/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId, sourceId, force: true }),
      });
      const body = await response.json() as RefreshResponse;
      if (!response.ok) {
        setResult(body.error || classifyProviderError('upstream request failed'));
        return;
      }
      if (body.skipped) {
        setResult({ kind: 'success', message: body.reasonCode ? t(`refresh.skip.${body.reasonCode}`) : body.reason || t('refresh.skip.import') });
        return;
      }

      const checkedAt = body.lastCheckedAt || new Date().toISOString();
      setLastCheckedAt(checkedAt);
      setResult({
        kind: 'success',
        message: body.newChapterCount
          ? t(body.newChapterCount === 1 ? 'refresh.done_one' : 'refresh.done_other', { count: body.newChapterCount })
          : t("refresh.up_to_date"),
      });
      window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
      router.refresh();
    } catch (error) {
      setResult(classifyProviderError(error, { offline: !navigator.onLine }));
    } finally {
      setRefreshing(false);
    }
  }

  const error = result && result.kind !== 'success' ? result : null;

  return (
    <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8" aria-label={t("refresh.aria")}>
      <div className="flex flex-col gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-300">{t("refresh.title")}</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">{formatCheckedAt(lastCheckedAt, locale, t)} · {t("refresh.manual_only")}</p>
          {result ? (
            <p className={`mt-1 text-[11px] leading-5 ${error ? 'text-amber-200/80' : 'text-emerald-300/80'}`} role="status" aria-live="polite">
              {error ? `${providerErrorText(t, error).title}: ${providerErrorText(t, error).message}` : result.message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="button-secondary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {refreshing ? t("refresh.checking") : error?.retryable ? t("refresh.retry") : t("refresh.refresh")}
        </button>
      </div>
    </section>
  );
}
