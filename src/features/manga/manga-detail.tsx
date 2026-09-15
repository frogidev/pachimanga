"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MockCoverArt } from "@/components/mock-cover-art";
import { addLibraryEntry, clearProgress, getHistory, getLibraryEntries, removeLibraryEntry, saveProgress, setEntryProgress } from "@/lib/storage/reader-storage";
import { idbGetAll } from "@/lib/storage/idb";
import type { Chapter, Manga, ReadingProgress } from "@/types/models";

type ExternalReadLink = { label: string; url: string };

function externalReadLink(description: string): ExternalReadLink | null {
  const match = description.match(/\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+)\)/i);
  if (!match) return null;
  try {
    const url = new URL(match[2]);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { label: match[1].trim() || url.hostname, url: url.toString() };
  } catch {
    return null;
  }
}

function cleanDescription(description: string) {
  return description
    .replace(/\r/g, "")
    .replace(/\s*---+\s*/g, "\n\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sourceName(sourceId: string) {
  if (sourceId === "weebcentral") return "WeebCentral";
  if (sourceId === "comick") return "ComicK";
  if (sourceId === "mangadex") return "MangaDex";
  return "this source";
}

function summarizeReadState(chapters: Chapter[], map: Record<string, number>) {
  const readNumbers = chapters
    .filter((chapter) => (map[chapter.id] ?? 0) >= 99)
    .map((chapter) => Number(chapter.chapterNumber || 0))
    .filter((n) => n > 0);
  return {
    progress: chapters.length ? Math.round((readNumbers.length / chapters.length) * 100) : 0,
    lastChapterRead: readNumbers.length ? Math.max(...readNumbers) : 0,
  };
}

export function MangaDetail({
  manga,
  chapters,
  readerBasePath = "/reader",
  backHref = "/",
}: {
  manga: Manga;
  chapters: Chapter[];
  readerBasePath?: string;
  backHref?: string;
}) {
  const [inLibrary, setInLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chapterProgress, setChapterProgress] = useState<Record<string, number>>({});
  const [busyChapter, setBusyChapter] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number; label: string } | null>(null);
  const bulkCancel = useRef(false);
  const [continueTo, setContinueTo] = useState<{ id: string; title: string } | null>(null);
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(chapters.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleChapters = chapters.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const readCount = useMemo(
    () => chapters.filter((chapter) => (chapterProgress[chapter.id] ?? 0) >= 99).length,
    [chapters, chapterProgress],
  );
  const external = useMemo(() => externalReadLink(manga.description), [manga.description]);
  const description = useMemo(() => cleanDescription(manga.description), [manga.description]);
  const provider = sourceName(manga.sourceId);
  const chapterHref = (chapterId: string) => `${readerBasePath}/${chapterId}`;

  useEffect(() => {
    let cancelled = false;
    void getLibraryEntries().then((entries) => {
      if (!cancelled) setInLibrary(entries.some((entry) => entry.mangaId === manga.id));
    });
    return () => { cancelled = true; };
  }, [manga.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [allProgress, history] = await Promise.all([
          idbGetAll<ReadingProgress>('progress'),
          getHistory().catch(() => []),
        ]);
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const row of allProgress) {
          if (row.mangaId === manga.id) map[row.chapterId] = Number(row.percentage || 0);
        }
        setChapterProgress(map);
        const latest = history.find((entry) => entry.mangaId === manga.id);
        if (latest) {
          const chapter = chapters.find((item) => item.id === latest.chapterId);
          setContinueTo({ id: latest.chapterId, title: chapter?.title || 'latest position' });
        } else {
          setContinueTo(null);
        }
      } catch {
        // Read state is best-effort; chapters remain readable without it.
      }
    })();
    return () => { cancelled = true; };
  }, [manga.id, chapters]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const entries = await getLibraryEntries();
        const entry = entries.find((item) => item.mangaId === manga.id);
        if (cancelled || !entry || entry.progress != null) return;
        const lastChapter = Number(entry.lastChapterRead || 0);
        if (!lastChapter || !chapters.length) return;
        const numbers = chapters.map((chapter) => Number(chapter.chapterNumber || 0)).filter((n) => n > 0);
        const max = Math.max(...numbers, lastChapter);
        const best = chapters.reduce<Chapter | null>((acc, chapter) => {
          const n = Number(chapter.chapterNumber || 0);
          if (n <= 0 || n > lastChapter) return acc;
          if (!acc || n > Number(acc.chapterNumber || 0)) return chapter;
          return acc;
        }, null);
        if (!best) return;
        const percentage = Math.max(0, Math.min(99, Math.round((lastChapter / max) * 100)));
        await saveProgress({
          mangaId: manga.id,
          chapterId: best.id,
          pageIndex: Math.max(0, Number(entry.lastPageRead || 0)),
          scrollPosition: 0,
          percentage,
          updatedAt: new Date().toISOString(),
        });
        if (!cancelled) {
          setChapterProgress((map) => ({ ...map, [best.id]: percentage }));
          await setEntryProgress(manga.id, { progress: percentage });
        }
      } catch {
        // Imported-progress resolution is best-effort; the reader still works without it.
      }
    })();
    return () => { cancelled = true; };
  }, [manga.id, chapters]);

  useEffect(() => { setPage(0); }, [manga.id]);

  async function toggleLibrary() {
    setBusy(true);
    try {
      if (inLibrary) await removeLibraryEntry(manga.id);
      else await addLibraryEntry(manga.id, manga.sourceId, manga);
      const entries = await getLibraryEntries();
      setInLibrary(entries.some((entry) => entry.mangaId === manga.id));
    } finally {
      setBusy(false);
    }
  }

  async function toggleChapterRead(chapter: Chapter) {
    if (busyChapter || bulk) return;
    const read = (chapterProgress[chapter.id] ?? 0) >= 99;
    const next = read ? 0 : 100;
    setBusyChapter(chapter.id);
    try {
      if (read) {
        await clearProgress(chapter.id);
      } else {
        await saveProgress({
          mangaId: manga.id,
          chapterId: chapter.id,
          pageIndex: 0,
          scrollPosition: 0,
          percentage: 100,
          updatedAt: new Date().toISOString(),
        });
      }
      const map = { ...chapterProgress, [chapter.id]: next };
      setChapterProgress(map);
      const summary = summarizeReadState(chapters, map);
      await setEntryProgress(manga.id, { progress: summary.progress, lastChapterRead: summary.lastChapterRead }).catch(() => {});
    } finally {
      setBusyChapter(null);
    }
  }

  async function runBulkMark(targets: Chapter[], read: boolean, label: string) {
    if (!targets.length || bulk) return;
    if (!window.confirm(`${label} (${targets.length} chapter${targets.length === 1 ? "" : "s"} of "${manga.title}")?`)) return;
    bulkCancel.current = false;
    setBulk({ done: 0, total: targets.length, label });
    const base = { ...chapterProgress };
    const acc: Record<string, number> = {};
    try {
      const now = new Date().toISOString();
      let done = 0;
      for (const chapter of targets) {
        if (bulkCancel.current) break;
        if (read) {
          await saveProgress({
            mangaId: manga.id,
            chapterId: chapter.id,
            pageIndex: 0,
            scrollPosition: 0,
            percentage: 100,
            updatedAt: now,
          });
        } else {
          await clearProgress(chapter.id);
        }
        done += 1;
        acc[chapter.id] = read ? 100 : 0;
        setBulk({ done, total: targets.length, label });
        setChapterProgress((map) => ({ ...map, [chapter.id]: read ? 100 : 0 }));
      }
      const summary = summarizeReadState(chapters, { ...base, ...acc });
      await setEntryProgress(manga.id, { progress: summary.progress, lastChapterRead: summary.lastChapterRead }).catch(() => {});
    } finally {
      setBulk(null);
    }
  }

  async function markAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await runBulkMark(chapters, true, "Mark all as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function markAllUnread() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await runBulkMark(chapters, false, "Mark all as unread");
    } finally {
      setMarkingAll(false);
    }
  }

  async function markFromHere(index: number) {
    const targets = chapters.slice(index);
    const chapter = chapters[index];
    if (!chapter || bulk) return;
    await runBulkMark(targets, true, `Mark "${chapter.title}" and older as read`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <Link href={backHref} className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-zinc-500 transition hover:text-pink-300">← Library</Link>

      <section className="mt-5 overflow-hidden rounded-[22px] border border-white/[.08] bg-gradient-to-br from-[#171520] to-[#0f0e15] p-4 shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:p-6 lg:p-8">
        <div className="grid gap-7 sm:grid-cols-[190px_1fr] lg:grid-cols-[230px_1fr] lg:gap-10">
          <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-[16px] bg-zinc-900 shadow-2xl shadow-black/35 ring-1 ring-white/10 sm:mx-0 sm:w-full">
            {manga.sourceId === "mock" ? <MockCoverArt manga={manga} className="h-full w-full" /> : <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill className="object-cover" priority unoptimized />}
          </div>

          <div className="self-center">
            <p className="pixel-kicker text-[9px] text-pink-400">Manga details</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {manga.genres.map((genre) => <span key={genre} className="rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[11px] text-zinc-400">{genre}</span>)}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-.045em] text-white sm:text-4xl">{manga.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">{manga.author || "Unknown author"} · <span className="capitalize">{manga.status}</span> · {provider}</p>
            {description ? <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-zinc-400 sm:text-[15px]">{description}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {continueTo ? <Link href={chapterHref(continueTo.id)} className="button-primary px-5 py-3 text-sm">Continue · {continueTo.title}</Link> : null}
              {chapters[0] ? <Link href={chapterHref(chapters[0].id)} className={`${continueTo ? "button-secondary" : "button-primary"} px-5 py-3 text-sm`}>Read latest</Link> : null}
              {!chapters.length && external ? <a href={external.url} target="_blank" rel="noreferrer noopener" className="button-primary px-5 py-3 text-sm">Read on {external.label} ↗</a> : null}
              <button type="button" onClick={toggleLibrary} disabled={busy} className="button-secondary px-5 py-3 text-sm font-medium disabled:opacity-50">{inLibrary ? "Remove from library" : "Add to library"}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">Read</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-.03em]">Chapters</h2>
          </div>
          <span className="text-xs text-zinc-600">{chapters.length ? `${readCount}/${chapters.length} read · ${chapters.length} available` : "No in-app chapters"}</span>
        </div>
        {chapters.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {pageCount > 1 ? (
              <div className="flex items-center gap-1" role="navigation" aria-label="Chapter pages">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-xl px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/[.06] hover:text-zinc-100 disabled:opacity-40"
                >
                  ← Newer
                </button>
                <span className="px-1 font-mono text-[11px] text-zinc-500" aria-live="polite">Page {safePage + 1}/{pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="rounded-xl px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/[.06] hover:text-zinc-100 disabled:opacity-40"
                >
                  Older →
                </button>
              </div>
            ) : <span />}
            <div className="flex flex-wrap items-center gap-2">
            {bulk ? (
              <div className="flex min-w-52 flex-1 items-center gap-3 sm:max-w-xs" role="progressbar" aria-valuenow={bulk.done} aria-valuemin={0} aria-valuemax={bulk.total} aria-label={bulk.label}>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-sky-300 transition-[width]" style={{ width: `${Math.round((bulk.done / Math.max(1, bulk.total)) * 100)}%` }} />
                </div>
                <span className="shrink-0 font-mono text-[10px] text-zinc-500">{bulk.done}/{bulk.total}</span>
                <button
                  type="button"
                  onClick={() => { bulkCancel.current = true; }}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-white/[.06] hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll || bulk !== null}
              className="rounded-xl px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[.06] hover:text-pink-300 disabled:opacity-50"
            >
              {markingAll ? "Marking…" : "Mark all as read"}
            </button>
            <button
              type="button"
              onClick={() => void markAllUnread()}
              disabled={markingAll || bulk !== null}
              className="rounded-xl px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[.06] hover:text-red-300 disabled:opacity-50"
            >
              Mark all as unread
            </button>
            </div>
          </div>
        ) : null}
        {chapters.length ? (
          <div className="surface-card mt-4 divide-y divide-white/[.055] overflow-hidden">
            {visibleChapters.map((chapter, index) => {
              const globalIndex = safePage * PAGE_SIZE + index;
              const pct = chapterProgress[chapter.id] ?? 0;
              const read = pct >= 99;
              const busy = busyChapter === chapter.id;
              return (
              <Link key={chapter.id} href={chapterHref(chapter.id)} className="group flex min-h-14 items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/[.035] sm:px-5">
                <span aria-hidden="true" title={read ? "Read" : pct > 0 ? `${Math.round(pct)}% read` : "Unread"} className={`size-2 shrink-0 rounded-full ${read ? "bg-emerald-400" : pct > 0 ? "bg-sky-300" : "bg-zinc-700"}`} />
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.04] font-mono text-[10px] text-zinc-600 group-hover:bg-pink-400/10 group-hover:text-pink-300">{String(chapters.length - globalIndex).padStart(2, "0")}</span>
                <span className={`min-w-0 flex-1 truncate font-medium ${read ? "text-zinc-500" : "text-zinc-200"}`}>{chapter.title}</span>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={read}
                  aria-label={read ? `Mark ${chapter.title} as unread` : `Mark ${chapter.title} as read`}
                  title={read ? "Mark as unread" : "Mark as read"}
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); void toggleChapterRead(chapter); }}
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm transition disabled:opacity-50 ${read ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20" : "bg-white/[.04] text-zinc-500 hover:bg-white/[.08] hover:text-zinc-200"}`}
                >
                  {read ? "✓" : "○"}
                </button>
                <button
                  type="button"
                  disabled={busy || bulk !== null}
                  aria-label={`Mark ${chapter.title} and older chapters as read`}
                  title="Mark this chapter and older as read"
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); void markFromHere(globalIndex); }}
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.04] text-sm text-zinc-500 transition hover:bg-white/[.08] hover:text-pink-300 disabled:opacity-50"
                >
                  ⇣
                </button>
                <span className="shrink-0 text-xs text-zinc-600 transition group-hover:text-pink-300">Read →</span>
              </Link>
              );
            })}
          </div>
        ) : null}
        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-1" role="navigation" aria-label="Chapter pages">
            <button
              type="button"
              onClick={() => { setPage((p) => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={safePage === 0}
              className="rounded-xl px-4 py-2.5 text-xs text-zinc-400 transition hover:bg-white/[.06] hover:text-zinc-100 disabled:opacity-40"
            >
              ← Newer
            </button>
            <span className="px-2 font-mono text-[11px] text-zinc-500">Page {safePage + 1}/{pageCount}</span>
            <button
              type="button"
              onClick={() => { setPage((p) => Math.min(pageCount - 1, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={safePage >= pageCount - 1}
              className="rounded-xl px-4 py-2.5 text-xs text-zinc-400 transition hover:bg-white/[.06] hover:text-zinc-100 disabled:opacity-40"
            >
              Older →
            </button>
          </div>
        ) : null}
        {!chapters.length ? (
          <div className="surface-card mt-4 px-5 py-8 sm:px-6">
            <p className="text-sm font-semibold text-zinc-200">{provider} does not expose readable English chapters for this entry.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Pachimanga can keep the title in your library, but it will not fabricate chapter links when the upstream source only provides metadata.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {external ? <a href={external.url} target="_blank" rel="noreferrer noopener" className="button-primary px-4 py-2.5 text-sm">Read on {external.label} ↗</a> : null}
              <a href={manga.sourceUrl} target="_blank" rel="noreferrer noopener" className="button-secondary px-4 py-2.5 text-sm">Open {provider} ↗</a>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
