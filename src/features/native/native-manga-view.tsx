"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MangaDetail } from "@/features/manga/manga-detail";
import {
  getNativeWeebCentralChapters,
  getNativeWeebCentralManga,
  isTauriNative,
} from "@/lib/native/tauri-bridge";
import type { Chapter, Manga } from "@/types/models";

export function NativeMangaView({ id }: { id: string }) {
  const [data, setData] = useState<{ manga: Manga; chapters: Chapter[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isTauriNative()) {
      setError("This WeebCentral route requires the installed Pachimanga native app.");
      return;
    }
    if (!id.startsWith("wc-")) {
      setError("This native route only supports WeebCentral titles.");
      return;
    }

    void Promise.all([
      getNativeWeebCentralManga(id),
      getNativeWeebCentralChapters(id),
    ])
      .then(([manga, chapters]) => {
        if (!cancelled) setData({ manga, chapters });
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "WeebCentral is unavailable from this device.");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="pixel-kicker text-[9px] text-pink-400">Native WeebCentral</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Unable to open this title</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/browse" className="button-primary px-4 py-2.5 text-sm">Back to Browse</Link>
          <Link href="/" className="button-secondary px-4 py-2.5 text-sm">Library</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-[520px] animate-pulse rounded-[22px] border border-white/[.06] bg-white/[.035]" />
      </div>
    );
  }

  return (
    <MangaDetail
      manga={data.manga}
      chapters={data.chapters}
      readerBasePath="/reader/native"
      backHref="/browse"
    />
  );
}
