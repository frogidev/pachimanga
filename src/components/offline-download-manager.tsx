"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAllOfflineChapters,
  getOfflineStorageEstimate,
  listOfflineChapters,
  removeOfflineChapter,
  retryOfflineChapter,
  type OfflineChapterRecord,
} from "@/lib/offline/chapter-cache";
import {
  chapterPdfName,
  downloadBlob,
  exportChapterPdf,
  exportMangaZip,
  ImageNotExportableError,
  printChapter,
  safeFileName,
} from "@/lib/offline/chapter-export";
import { useLocale } from "@/lib/i18n";

const CHANGE_EVENT = "pachimanga:offline-cache-change";

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount >= 10 || unit === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[unit]}`;
}

type Group = { mangaId: string; title: string; chapters: OfflineChapterRecord[] };

export function OfflineDownloadManager() {
  const { t } = useLocale();
  const [items, setItems] = useState<OfflineChapterRecord[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void listOfflineChapters().then((next) => {
        if (!cancelled) setItems(next);
      });
      void getOfflineStorageEstimate().then((next) => {
        if (!cancelled) setStorage(next);
      });
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, load);
    };
  }, []);

  const groups = useMemo<Group[]>(() => {
    const byManga = new Map<string, Group>();
    for (const item of items) {
      const group = byManga.get(item.mangaId) ?? { mangaId: item.mangaId, title: item.mangaTitle, chapters: [] };
      group.chapters.push(item);
      byManga.set(item.mangaId, group);
    }
    return [...byManga.values()];
  }, [items]);

  const run = useCallback(async (id: string, task: () => Promise<string>, fallback: string) => {
    setBusy(id);
    setMessage("");
    try {
      setMessage(await task());
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(null);
    }
  }, []);

  const remove = (item: OfflineChapterRecord) =>
    run(item.key, async () => {
      await removeOfflineChapter(item);
      return `${t("offline.removed")} ${item.chapterTitle}.`;
    }, t("offline.remove_failed"));

  const retry = (item: OfflineChapterRecord) =>
    run(item.key, async () => {
      const result = await retryOfflineChapter(item);
      return result.failed ? `${result.failed} ${t("offline.still_failed")}` : t("offline.complete");
    }, t("offline.retry_failed"));

  const pdf = (item: OfflineChapterRecord) =>
    run(item.key, async () => {
      try {
        downloadBlob(await exportChapterPdf(item), chapterPdfName(item));
        return t("offline.pdf_done", { name: chapterPdfName(item) });
      } catch (error) {
        if (!(error instanceof ImageNotExportableError)) throw error;
        // The image host blocks cross-origin reads: let the browser print the pages to PDF instead.
        return printChapter(item, t("offline.print_hint")) ? t("offline.print_opened") : t("offline.popup_blocked");
      }
    }, t("offline.pdf_failed"));

  const exportAll = (group: Group) =>
    run(`zip:${group.mangaId}`, async () => {
      const result = await exportMangaZip(group.chapters.slice().reverse(), (done, total) => setMessage(t("offline.exporting", { done, total })));
      if (!result.blob) return t("offline.zip_none");
      downloadBlob(result.blob, `${safeFileName(group.title)}.zip`);
      return result.skipped ? t("offline.zip_partial", { exported: result.exported, skipped: result.skipped }) : t("offline.zip_done", { exported: result.exported });
    }, t("offline.pdf_failed"));

  const removeGroup = (group: Group) =>
    run(`rm:${group.mangaId}`, async () => {
      if (!window.confirm(t("offline.remove_all_confirm", { title: group.title }))) return "";
      for (const chapter of group.chapters) await removeOfflineChapter(chapter);
      return t("offline.removed_all", { title: group.title });
    }, t("offline.remove_failed"));

  const clearAll = () =>
    run("clear", async () => {
      if (!window.confirm(t("offline.clear_confirm"))) return "";
      await clearAllOfflineChapters();
      return t("offline.cleared");
    }, t("offline.remove_failed"));

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="offline-downloads-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="offline-downloads-title" className="text-lg font-semibold text-zinc-100">{t("offline.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{t("offline.desc")}</p>
          {storage ? <p className="mt-1 text-xs text-zinc-600">{t("device.usage", { used: formatBytes(storage.usage), quota: formatBytes(storage.quota) })}</p> : null}
        </div>
        {items.length ? (
          <button type="button" disabled={busy !== null} onClick={() => void clearAll()} className="min-h-10 shrink-0 rounded-xl border border-red-300/15 px-3 text-xs text-red-300 disabled:opacity-40">{t("device.clear")}</button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        {groups.length ? groups.map((group) => {
          const pages = group.chapters.reduce((sum, chapter) => sum + chapter.savedCount, 0);
          return (
            <details key={group.mangaId} className="rounded-xl border border-white/[.07] bg-white/[.025]" open={groups.length === 1}>
              <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-200">{group.title}</span>
                  <span className="block text-xs text-zinc-500">{t(group.chapters.length === 1 ? "offline.chapters_one" : "offline.chapters_other", { count: group.chapters.length })} · {pages} {t("offline.pages")}</span>
                </span>
              </summary>
              <div className="border-t border-white/[.06] px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void exportAll(group)} className="button-secondary min-h-10 px-3 text-xs disabled:opacity-40">{busy === `zip:${group.mangaId}` ? t("offline.working") : t("offline.export_all")}</button>
                  <button type="button" disabled={busy !== null} onClick={() => void removeGroup(group)} className="min-h-10 rounded-xl border border-red-300/15 px-3 text-xs text-red-300 disabled:opacity-40">{t("offline.remove_all")}</button>
                </div>
                <ul className="mt-3 grid gap-2">
                  {group.chapters.map((item) => {
                    const complete = item.total > 0 && item.savedCount >= item.total;
                    const rowBusy = busy === item.key;
                    return (
                      <li key={item.key} className="rounded-lg border border-white/[.06] bg-black/10 p-2.5 sm:flex sm:items-center sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-zinc-200">{item.chapterTitle}</div>
                          <div className="mt-0.5 text-xs text-zinc-500">{item.savedCount}/{item.total} {t("offline.pages")}</div>
                        </div>
                        <div className="mt-2 flex gap-2 sm:mt-0">
                          <button type="button" disabled={busy !== null || item.savedCount === 0} onClick={() => void pdf(item)} className="button-secondary min-h-10 px-3 text-xs disabled:opacity-40">{rowBusy ? t("offline.working") : t("offline.pdf")}</button>
                          {!complete ? <button type="button" disabled={busy !== null} onClick={() => void retry(item)} className="button-secondary min-h-10 px-3 text-xs disabled:opacity-40">{t("offline.retry")}</button> : null}
                          <button type="button" disabled={busy !== null} onClick={() => void remove(item)} className="min-h-10 rounded-xl border border-red-300/15 px-3 text-xs text-red-300 disabled:opacity-40">{t("offline.remove")}</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          );
        }) : (
          <p className="rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-3 text-sm text-zinc-500">{t("offline.empty")}</p>
        )}
      </div>

      <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
