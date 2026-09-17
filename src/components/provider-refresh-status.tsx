'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { classifyProviderError, type ProviderErrorInfo } from '@/lib/source/provider-error';
import { getLibraryEntries } from '@/lib/storage/reader-storage';

type RefreshResponse = {
  lastCheckedAt?: string;
  newChapterCount?: number;
  skipped?: boolean;
  reason?: string;
  error?: ProviderErrorInfo;
};

function formatCheckedAt(value: string | null) {
  if (!value) return 'Not checked yet';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Last checked time unavailable';
  return `Last checked ${new Date(time).toLocaleString()}`;
}

export function ProviderRefreshStatus({ mangaId, sourceId }: { mangaId: string; sourceId: string }) {
  const router = useRouter();
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
        body: JSON.stringify({ mangaId, force: true }),
      });
      const body = await response.json() as RefreshResponse;
      if (!response.ok) {
        setResult(body.error || classifyProviderError('upstream request failed'));
        return;
      }
      if (body.skipped) {
        setResult({ kind: 'success', message: body.reason || 'This title does not have a live provider.' });
        return;
      }

      const checkedAt = body.lastCheckedAt || new Date().toISOString();
      setLastCheckedAt(checkedAt);
      setResult({
        kind: 'success',
        message: body.newChapterCount
          ? `Refresh complete. ${body.newChapterCount} unread provider update${body.newChapterCount === 1 ? '' : 's'} tracked.`
          : 'Refresh complete. Chapter metadata is up to date.',
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
    <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Provider refresh status">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-300">Provider chapters</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">{formatCheckedAt(lastCheckedAt)} · Manual refresh only; no background polling.</p>
          {result ? (
            <p className={`mt-1 text-[11px] leading-5 ${error ? 'text-amber-200/80' : 'text-emerald-300/80'}`} role="status" aria-live="polite">
              {error ? `${error.title}: ${error.message}` : result.message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="button-secondary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {refreshing ? 'Checking…' : error?.retryable ? 'Retry chapter refresh' : 'Refresh chapters'}
        </button>
      </div>
    </section>
  );
}
