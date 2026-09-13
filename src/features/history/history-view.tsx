"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { getMockChapter, getMockManga } from "@/lib/mock-data";
import { getHistory } from "@/lib/storage/reader-storage";
import type { ReadingHistoryEntry } from "@/types/models";

export function HistoryView() {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const load = useCallback(() => void getHistory().then(setHistory), []);

  useEffect(() => {
    load();
    window.addEventListener("pachimanga:history-change", load);
    return () => window.removeEventListener("pachimanga:history-change", load);
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeading title="History" subtitle="Reading activity stored locally on this device" />
      <div className="mt-7 space-y-2">
        {history.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center text-sm text-zinc-500">
            Open a chapter and start reading to build your history.
          </div>
        ) : history.map((entry) => {
          const manga = getMockManga(entry.mangaId);
          const chapter = getMockChapter(entry.chapterId);
          if (!manga || !chapter) return null;
          return (
            <Link
              key={entry.mangaId}
              href={`/reader/${entry.chapterId}`}
              className="flex items-center gap-4 rounded-2xl border border-transparent p-3 transition hover:border-white/8 hover:bg-white/[0.03]"
            >
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                <Image src={manga.coverUrl} alt="" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{manga.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{chapter.title} · {Math.round(entry.percentage)}%</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full bg-pink-400" style={{ width: `${entry.percentage}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
