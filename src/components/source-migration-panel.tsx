"use client";

import { useState } from "react";
import { sourceDisplayName } from "@/lib/source-labels";
import { buildChapterMigrationMap } from "@/lib/library/source-migration";
import { migrateLibrarySource } from "@/lib/storage/source-migration";
import type { Chapter, Manga } from "@/types/models";
import { useLocale } from "@/lib/i18n";

type SearchResponse = { items?: Manga[]; error?: string };
type ChapterResponse = { chapters?: Chapter[]; error?: { message?: string } };

export function SourceMigrationPanel({ manga, chapters, onMigrated }: {
  manga: Manga;
  chapters: Chapter[];
  onMigrated?: (target: Manga) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  const [query, setQuery] = useState(manga.title);
  const [results, setResults] = useState<Manga[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function search() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setMessage("");
    try {
      const response = await fetch(`/api/source/search?q=${encodeURIComponent(q)}&lang=all`, { cache: "no-store" });
      const body = await response.json() as SearchResponse;
      if (!response.ok) throw new Error(body.error || t("migrate.search_failed"));
      setResults((body.items || []).filter((item) => !(item.sourceId === manga.sourceId && item.id === manga.id)));
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : t("migrate.search_failed"));
    } finally {
      setSearching(false);
    }
  }

  async function migrate(target: Manga) {
    if (busyId) return;
    if (!window.confirm(t("migrate.confirm", { title: manga.title, from: sourceDisplayName(manga.sourceId) ?? manga.sourceId, to: sourceDisplayName(target.sourceId) ?? target.sourceId }))) return;
    setBusyId(target.id);
    setMessage("");
    try {
      const response = await fetch(`/api/source/chapters?source=${encodeURIComponent(target.sourceId)}&mangaId=${encodeURIComponent(target.id)}`, { cache: "no-store" });
      const body = await response.json() as ChapterResponse;
      if (!response.ok) throw new Error(body.error?.message || t("migrate.chapters_failed"));
      const targetChapters = Array.isArray(body.chapters) ? body.chapters : [];
      const chapterMap = buildChapterMigrationMap(chapters, targetChapters);
      const result = await migrateLibrarySource({
        fromSourceId: manga.sourceId,
        fromMangaId: manga.id,
        target,
        chapterMap,
      });
      setMessage(
        result.unmappedProgress
          ? t("migrate.done_partial", { mapped: result.migratedProgress, unmapped: result.unmappedProgress })
          : t("migrate.done", { mapped: result.migratedProgress }),
      );
      setResults([]);
      onMigrated?.(target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("migrate.failed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.025] p-3">
      <button type="button" className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm text-zinc-300" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{t("migrate.title")}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-3">
          <p className="text-xs leading-5 text-zinc-500">{t("migrate.hint")}</p>
          <div className="mt-3 flex gap-2">
            <input className="field min-w-0 flex-1 px-3 py-2 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} maxLength={100} />
            <button type="button" className="button-secondary px-4 py-2 text-sm disabled:opacity-50" disabled={searching || !query.trim()} onClick={() => void search()}>{searching ? t("migrate.searching") : t("migrate.find")}</button>
          </div>
          {results.length ? (
            <div className="mt-3 grid gap-2">
              {results.map((target) => (
                <div key={`${target.sourceId}:${target.id}`} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-black/10 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-200">{target.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{sourceDisplayName(target.sourceId) ?? target.sourceId}</div>
                  </div>
                  <button type="button" disabled={Boolean(busyId)} onClick={() => void migrate(target)} className="button-secondary px-3 py-2 text-xs disabled:opacity-40">{busyId === target.id ? t("migrate.moving") : t("migrate.use")}</button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-3 min-h-5 text-xs text-zinc-500" role="status" aria-live="polite">{message}</p>
        </div>
      ) : null}
    </div>
  );
}
