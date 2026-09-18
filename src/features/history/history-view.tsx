"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { getHistory, getLibraryEntries, getReadingStats, type ReadingStats } from "@/lib/storage/reader-storage";
import type { LibraryEntry, ReadingHistoryEntry } from "@/types/models";

export function HistoryView() {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReadingStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextHistory, nextLibrary, nextStats] = await Promise.all([getHistory(), getLibraryEntries(), getReadingStats()]);
      setHistory(nextHistory);
      setLibrary(nextLibrary);
      setStats(nextStats);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load reading history for this account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void load(), 0);
    const onHistoryChange = () => void load();
    window.addEventListener("pachimanga:history-change", onHistoryChange);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("pachimanga:history-change", onHistoryChange);
    };
  }, [load]);

  return (
    <div className="app-page">
      <PageHeading eyebrow="Activity" title="Reading history" subtitle="Actual reading events stored for the signed-in account." />

      {error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-red-300/15 bg-red-400/[.05] px-4 py-3 text-sm text-red-200/80 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="button-secondary shrink-0 px-3 py-2 text-xs">Retry history load</button>
        </div>
      ) : null}

      {stats ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Reading statistics">
          <div className="surface-card p-4">
            <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Tracked chapters</p>
            <strong className="mt-2 block text-2xl text-zinc-100">{stats.trackedChapters}</strong>
          </div>
          <div className="surface-card p-4">
            <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Completed chapters</p>
            <strong className="mt-2 block text-2xl text-zinc-100">{stats.completedChapters}</strong>
          </div>
          <div className="surface-card p-4">
            <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Active titles</p>
            <strong className="mt-2 block text-2xl text-zinc-100">{stats.activeTitles}</strong>
          </div>
          <div className="surface-card p-4">
            <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">Average saved progress</p>
            <strong className="mt-2 block text-2xl text-zinc-100">{Math.round(stats.averageProgress)}%</strong>
            {stats.lastUpdatedAt ? <p className="mt-1 text-[10px] text-zinc-600">Latest save {new Date(stats.lastUpdatedAt).toLocaleString()}</p> : null}
          </div>
        </section>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="space-y-3" aria-label="Loading reading history">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-white/[.045]" />)}
          </div>
        ) : error && history.length === 0 ? null : history.length === 0 ? (
          <div className="surface-card px-5 py-5 text-sm text-zinc-400">
            <strong className="text-zinc-200">0 reading events are stored for this account.</strong>
            <span className="ml-2">There is no synchronized history to render.</span>
          </div>
        ) : history.map((entry) => {
          const manga = library.find((item) => item.mangaId === entry.mangaId)?.manga;
          const percentage = Math.max(0, Math.min(100, Number(entry.percentage) || 0));
          return (
            <Link key={`${entry.mangaId}-${entry.chapterId}`} href={`/reader/${entry.chapterId}`} className="surface-card group flex items-center gap-4 p-3.5 transition hover:border-pink-300/20 hover:bg-[#171520]">
              <div className="relative grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-zinc-900 ring-1 ring-white/[.07]">
                {manga?.coverUrl ? (
                  <Image src={manga.coverUrl} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <span className="px-1 text-center text-[9px] uppercase tracking-[.12em] text-zinc-600">No cover</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-100 group-hover:text-white">{manga?.title || "Metadata unavailable"}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">Chapter {entry.chapterId}</p>
                    {!manga ? <p className="mt-1 truncate font-mono text-[9px] text-zinc-700">Manga ID: {entry.mangaId}</p> : null}
                  </div>
                  <span className="rounded-full bg-pink-400/10 px-2.5 py-1 font-mono text-[9px] text-pink-300">{Math.round(percentage)}%</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-sky-300" style={{ width: `${percentage}%` }} />
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">Continue reading →</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
