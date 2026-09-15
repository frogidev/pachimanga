"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MockCoverArt } from "@/components/mock-cover-art";
import { PageHeading } from "@/components/page-heading";
import { PachiMascotImg } from "@/components/pachi-mascot-img";
import { getHistory, getLibraryEntries } from "@/lib/storage/reader-storage";
import type { LibraryEntry, ReadingHistoryEntry } from "@/types/models";

export function HistoryView() {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const load = useCallback(() => {
    void Promise.all([getHistory(), getLibraryEntries()]).then(([nextHistory, nextLibrary]) => {
      setHistory(nextHistory);
      setLibrary(nextLibrary);
    });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("pachimanga:history-change", load);
    return () => window.removeEventListener("pachimanga:history-change", load);
  }, [load]);

  return (
    <div className="app-page">
      <PageHeading eyebrow="Activity" title="Reading history" subtitle="Recent reading activity and progress synced to your account." />
      <div className="mt-6 space-y-3">
        {history.length === 0 ? (
          <div className="surface-card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <PachiMascotImg width={128} height={85} className="h-auto w-32 rounded-xl object-cover" />
            <h2 className="mt-2 text-lg font-semibold text-zinc-200">Your reading trail starts here</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Open a chapter and start reading. Pachimanga will keep your most recent position under this account.</p>
            <Link href="/browse" className="button-primary mt-5 px-4 py-2.5 text-sm">Browse manga</Link>
          </div>
        ) : history.map((entry) => {
          const manga = library.find((item) => item.mangaId === entry.mangaId)?.manga;
          const fallback = manga ?? {
            id: entry.mangaId,
            sourceId: "import",
            title: "Saved manga",
            alternativeTitles: [],
            description: "",
            coverUrl: "",
            author: "",
            artist: "",
            status: "unknown" as const,
            genres: [],
            sourceUrl: "",
          };
          return (
            <Link key={`${entry.mangaId}-${entry.chapterId}`} href={`/reader/${entry.chapterId}`} className="surface-card group flex items-center gap-4 p-3.5 transition hover:border-pink-300/20 hover:bg-[#171520]">
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[10px] bg-zinc-900 ring-1 ring-white/[.07]">
                {fallback.coverUrl ? <Image src={fallback.coverUrl} alt="" fill className="object-cover" unoptimized /> : <MockCoverArt manga={fallback} className="h-full w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-100 group-hover:text-white">{fallback.title}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{entry.chapterId}</p>
                  </div>
                  <span className="rounded-full bg-pink-400/10 px-2.5 py-1 font-mono text-[9px] text-pink-300">{Math.round(entry.percentage)}%</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-sky-300" style={{ width: `${entry.percentage}%` }} />
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
