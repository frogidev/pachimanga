"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReaderView } from "@/features/reader/reader-view";
import { getNativeWeebCentralChapterContext, isTauriNative } from "@/lib/native/tauri-bridge";
import type { Chapter, Manga, Page } from "@/types/models";

type Context = {
  manga: Manga;
  chapter: Chapter;
  chapters: Chapter[];
  pages: Page[];
};

export function NativeReaderLoader({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<Context | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!isTauriNative()) {
        setError("This reader route requires the installed Pachimanga native app.");
        return;
      }
      if (!chapterId.startsWith("wc-")) {
        setError("This native route only supports WeebCentral chapters.");
        return;
      }

      void getNativeWeebCentralChapterContext(chapterId)
        .then((context) => {
          if (!cancelled) setData(context);
        })
        .catch((reason) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "WeebCentral is unavailable from this device.");
        });
    });

    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black px-6 text-center text-white">
        <div>
          <p className="pixel-kicker text-[9px] text-pink-400">Native WeebCentral</p>
          <h1 className="mt-3 text-2xl font-bold">Reader unavailable</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">{error}</p>
          <Link href="/browse" className="button-primary mt-6 inline-flex px-4 py-2.5 text-sm">Back to Browse</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black text-sm text-zinc-500">
        Loading chapter from WeebCentral on this device…
      </div>
    );
  }

  return (
    <ReaderView
      manga={data.manga}
      chapter={data.chapter}
      chapters={data.chapters}
      pages={data.pages}
      routeBasePath="/reader/native"
      mangaBasePath="/native/manga"
    />
  );
}
