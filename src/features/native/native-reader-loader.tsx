"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReaderView } from "@/features/reader/reader-view";
import { getNativeWeebCentralChapterContext, isTauriNative } from "@/lib/native/tauri-bridge";
import type { Chapter, Manga, Page } from "@/types/models";
import { useLocale } from "@/lib/i18n";

type Context = {
  manga: Manga;
  chapter: Chapter;
  chapters: Chapter[];
  pages: Page[];
};

export function NativeReaderLoader({ chapterId }: { chapterId: string }) {
  const { t } = useLocale();
  const [data, setData] = useState<Context | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!isTauriNative()) {
        setError("native.reader_needs_app");
        return;
      }
      if (!chapterId.startsWith("wc-")) {
        setError("native.chapters_only");
        return;
      }

      void getNativeWeebCentralChapterContext(chapterId)
        .then((context) => {
          if (!cancelled) setData(context);
        })
        .catch((reason) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "native.unavailable");
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
          <p className="pixel-kicker text-[9px] text-pink-400">{t("native.kicker")}</p>
          <h1 className="mt-3 text-2xl font-bold">{t("native.reader_unavailable")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">{t(error)}</p>
          <Link href="/browse" className="button-primary mt-6 inline-flex px-4 py-2.5 text-sm">{t("native.back_browse")}</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black text-sm text-zinc-500">
        {t("native.loading_chapter")}
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
