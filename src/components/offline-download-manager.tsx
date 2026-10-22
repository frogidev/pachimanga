"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listOfflineChapters,
  removeOfflineChapter,
  retryOfflineChapter,
  type OfflineChapterRecord,
} from "@/lib/offline/chapter-cache";
import { useLocale } from "@/lib/i18n";

const CHANGE_EVENT = "pachimanga:offline-cache-change";

export function OfflineDownloadManager() {
  const { t } = useLocale();
  const [items, setItems] = useState<OfflineChapterRecord[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void listOfflineChapters().then((next) => {
        if (!cancelled) setItems(next);
      });
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, load);
    };
  }, []);

  const run = useCallback(async (item: OfflineChapterRecord, task: () => Promise<string>, fallback: string) => {
    setBusyKey(item.key);
    setMessage("");
    try {
      setMessage(await task());
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setBusyKey(null);
    }
  }, []);

  const remove = (item: OfflineChapterRecord) =>
    run(item, async () => {
      await removeOfflineChapter(item);
      return `${t("offline.removed")} ${item.chapterTitle}.`;
    }, t("offline.remove_failed"));

  const retry = (item: OfflineChapterRecord) =>
    run(item, async () => {
      const result = await retryOfflineChapter(item);
      return result.failed ? `${result.failed} ${t("offline.still_failed")}` : t("offline.complete");
    }, t("offline.retry_failed"));

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="offline-downloads-title">
      <h2 id="offline-downloads-title" className="text-lg font-semibold text-zinc-100">{t("offline.title")}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{t("offline.desc")}</p>

      <ul className="mt-4 grid gap-2">
        {items.length ? items.map((item) => {
          const complete = item.total > 0 && item.savedCount >= item.total;
          const busy = busyKey === item.key;
          return (
            <li key={item.key} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3 sm:flex sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-200">{item.mangaTitle}</div>
                <div className="mt-1 truncate text-xs text-zinc-500">{item.chapterTitle} · {item.savedCount}/{item.total} {t("offline.pages")}</div>
              </div>
              <div className="mt-3 flex gap-2 sm:mt-0">
                {!complete ? (
                  <button type="button" disabled={busy} onClick={() => void retry(item)} className="button-secondary min-h-10 px-3 text-xs disabled:opacity-40">{t("offline.retry")}</button>
                ) : null}
                <button type="button" disabled={busy} onClick={() => void remove(item)} className="min-h-10 rounded-xl border border-red-300/15 px-3 text-xs text-red-300 disabled:opacity-40">{t("offline.remove")}</button>
              </div>
            </li>
          );
        }) : (
          <li className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-3 text-sm text-zinc-500">{t("offline.empty")}</li>
        )}
      </ul>

      <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
