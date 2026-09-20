"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SourceMigrationPanel } from "@/components/source-migration-panel";
import { AniListTrackingPanel } from "@/components/anilist-tracking-panel";
import { MyAnimeListTrackingPanel } from "@/components/myanimelist-tracking-panel";
import { readViewState, writeViewState } from "@/lib/ui/view-state";
import { useEffect, useMemo, useRef, useState } from "react";
import { addLibraryEntry, clearProgress, getHistory, getLibraryEntries, getMangaProgress, removeLibraryEntry, saveProgress, setEntryProgress } from "@/lib/storage/reader-storage";
import { normalizeLibraryReadingStatus, type LibraryReadingStatus } from "@/lib/library/library-state";
import { setLibraryReadingStatus } from "@/lib/storage/library-dashboard";
import type { Chapter, Manga, ReadingProgress } from "@/types/models";
import { allReadableChaptersComplete, firstReadableChapter, latestReadableChapter, nextUnreadReadableChapter } from "./read-target";

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

function chapterDate(value?: string) {
  if (!value) return "Date unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
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

function newestProgress(rows: ReadingProgress[]) {
  return rows.reduce<ReadingProgress | null>((latest, row) => {
    if (!latest) return row;
    const latestTime = Date.parse(latest.updatedAt);
    const rowTime = Date.parse(row.updatedAt);
    if (!Number.isFinite(latestTime)) return row;
    if (!Number.isFinite(rowTime)) return latest;
    return rowTime > latestTime ? row : latest;
  }, null);
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
  const [readingStatus, setReadingStatus] = useState<LibraryReadingStatus>("plan_to_read");
  const [readingStatusManual, setReadingStatusManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chapterProgress, setChapterProgress] = useState<Record<string, number>>({});
  const [busyChapter, setBusyChapter] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number; label: string } | null>(null);
  const bulkCancel = useRef(false);
  const [continueTo, setContinueTo] = useState<{ id: string; title: string } | null>(null);
  const [caughtUp, setCaughtUp] = useState(false);
  const [readStateLoaded, setReadStateLoaded] = useState(false);
  const PAGE_SIZE = 50;
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(chapters.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleChapters = chapters.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const firstChapter = useMemo(() => firstReadableChapter(chapters), [chapters]);
  const latestChapter = useMemo(() => latestReadableChapter(chapters), [chapters]);
  const readCount = useMemo(
    () => chapters.filter((chapter) => (chapterProgress[chapter.id] ?? 0) >= 99).length,
    [chapters, chapterProgress],
  );
  const trackingChapter = useMemo(
    () => summarizeReadState(chapters, chapterProgress).lastChapterRead,
    [chapters, chapterProgress],
  );
  const external = useMemo(() => externalReadLink(manga.description), [manga.description]);
  const description = useMemo(() => cleanDescription(manga.description), [manga.description]);
  const provider = sourceName(manga.sourceId);
  const chapterHref = (chapterId: string) => `${readerBasePath}/${chapterId}`;

  useEffect(() => {
    let cancelled = false;
    void getLibraryEntries().then((entries) => {
      if (cancelled) return;
      const entry = entries.find((item) => item.mangaId === manga.id && item.sourceId === manga.sourceId);
      setInLibrary(Boolean(entry));
      setReadingStatus(normalizeLibraryReadingStatus(entry?.readingStatus));
      setReadingStatusManual(Boolean(entry?.readingStatusManual));
    });
    return () => { cancelled = true; };
  }, [manga.id, manga.sourceId]);

  useEffect(() => {
    let cancelled = false;
    setReadStateLoaded(false);
    void (async () => {
      try {
        const [mangaProgress, history, entries] = await Promise.all([
          getMangaProgress(manga.id),
          getHistory().catch(() => []),
          getLibraryEntries().catch(() => []),
        ]);
        if (cancelled) return;

        const map: Record<string, number> = {};
        for (const row of mangaProgress) {
          map[row.chapterId] = Number(row.percentage || 0);
        }

        const libraryEntry = entries.find((entry) => entry.mangaId === manga.id && entry.sourceId === manga.sourceId);
        const legacyLastChapter = mangaProgress.length ? 0 : Number(libraryEntry?.lastChapterRead || 0);
        let legacyResume: Chapter | null = null;
        if (legacyLastChapter > 0) {
          for (const chapter of chapters) {
            const chapterNumber = Number(chapter.chapterNumber || 0);
            if (chapterNumber > 0 && chapterNumber <= legacyLastChapter) {
              map[chapter.id] = 100;
              if (!legacyResume || chapterNumber > Number(legacyResume.chapterNumber || 0)) legacyResume = chapter;
            }
          }
        }
        setChapterProgress(map);

        const latestHistory = history.find((entry) => entry.mangaId === manga.id);
        const partialProgress = mangaProgress.filter((row) => Number(row.percentage || 0) > 0 && Number(row.percentage || 0) < 99);
        let resumeProgress = latestHistory
          ? partialProgress.find((row) => row.chapterId === latestHistory.chapterId) || null
          : null;
        resumeProgress ||= newestProgress(partialProgress);
        if (cancelled) return;

        const partialChapter = resumeProgress
          ? chapters.find((item) => item.id === resumeProgress.chapterId) || null
          : null;
        const hasStarted = mangaProgress.length > 0 || legacyLastChapter > 0;
        const unreadChapter = hasStarted ? nextUnreadReadableChapter(chapters, map) : null;
        const chapter = partialChapter || unreadChapter || (!hasStarted ? legacyResume : null);
        setContinueTo(chapter ? { id: chapter.id, title: chapter.title } : null);
        setCaughtUp(hasStarted && allReadableChaptersComplete(chapters, map));
      } catch {
        if (!cancelled) setContinueTo(null);
        // Read state is best-effort; chapters remain readable without it.
      } finally {
        if (!cancelled) setReadStateLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [manga.id, manga.sourceId, chapters]);

  useEffect(() => { setPage(0); }, [manga.id]);

  useEffect(() => {
    const key = `manga:${manga.sourceId}:${manga.id}`;
    const saved = readViewState(key, {});
    requestAnimationFrame(() => window.scrollTo({ top: saved.scrollY, behavior: "auto" }));
    const persist = () => writeViewState(key, {}, window.scrollY);
    window.addEventListener("pagehide", persist);
    return () => { persist(); window.removeEventListener("pagehide", persist); };
  }, [manga.id, manga.sourceId]);

  async function toggleLibrary() {
    setBusy(true);
    try {
      if (inLibrary) await removeLibraryEntry(manga.id);
      else await addLibraryEntry(manga.id, manga.sourceId, manga);
      const entries = await getLibraryEntries();
      const entry = entries.find((item) => item.mangaId === manga.id && item.sourceId === manga.sourceId);
      setInLibrary(Boolean(entry));
      setReadingStatus(normalizeLibraryReadingStatus(entry?.readingStatus));
      setReadingStatusManual(Boolean(entry?.readingStatusManual));
    } finally {
      setBusy(false);
    }
  }

  async function changeReadingStatus(value: string) {
    if (!inLibrary || busy) return;
    const status = value === "automatic" ? null : value as LibraryReadingStatus;
    setBusy(true);
    try {
      await setLibraryReadingStatus(manga.id, manga.sourceId, status);
      setReadingStatusManual(status !== null);
      if (status) setReadingStatus(status);
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
      const unread = nextUnreadReadableChapter(chapters, map);
      setContinueTo(unread ? { id: unread.id, title: unread.title } : null);
      setCaughtUp(allReadableChaptersComplete(chapters, map));
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
      const nextMap = { ...base, ...acc };
      const summary = summarizeReadState(chapters, nextMap);
      const unread = nextUnreadReadableChapter(chapters, nextMap);
      setContinueTo(read && unread ? { id: unread.id, title: unread.title } : null);
      setCaughtUp(read && allReadableChaptersComplete(chapters, nextMap));
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

      <section className="manga-detail-hero mt-5 overflow-hidden rounded-[22px] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-7 sm:grid-cols-[190px_1fr] lg:grid-cols-[230px_1fr] lg:gap-10">
          <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-[16px] bg-zinc-900 shadow-2xl shadow-black/35 ring-1 ring-white/10 sm:mx-0 sm:w-full">
{manga.coverUrl ? (
              <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill className="object-cover" priority unoptimized />
            ) : (
              <div className="grid h-full w-full place-items-center px-4 text-center text-xs text-zinc-600">No cover available</div>
            )}
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
              {!readStateLoaded && chapters.length ? <span role="status" className="button-primary px-5 py-3 text-sm opacity-60">Loading reading position…</span> : null}
              {readStateLoaded && continueTo ? <Link href={chapterHref(continueTo.id)} className="button-primary px-5 py-3 text-sm">Continue · {continueTo.title}</Link> : null}
              {readStateLoaded && !continueTo && !caughtUp && firstChapter ? <Link href={chapterHref(firstChapter.id)} className="button-primary px-5 py-3 text-sm">Start reading · {firstChapter.title}</Link> : null}
              {readStateLoaded && caughtUp ? <span className="inline-flex items-center rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-5 py-3 text-sm font-medium text-emerald-200">Caught up · waiting for new chapters</span> : null}
              {readStateLoaded && continueTo && latestChapter && latestChapter.id !== continueTo.id ? <Link href={chapterHref(latestChapter.id)} className="button-secondary px-5 py-3 text-sm">Read latest</Link> : null}
              {readStateLoaded && caughtUp && latestChapter ? <Link href={chapterHref(latestChapter.id)} className="button-secondary px-5 py-3 text-sm">Reread latest</Link> : null}
              {!chapters.length && external ? <a href={external.url} target="_blank" rel="noreferrer noopener" className="button-primary px-5 py-3 text-sm">Read on {external.label} ↗</a> : null}
              <button type="button" onClick={toggleLibrary} disabled={busy} className="button-secondary px-5 py-3 text-sm font-medium disabled:opacity-50">{inLibrary ? "Remove from library" : "Add to library"}</button>
              {inLibrary ? (
                <label className="grid gap-1 text-[11px] text-zinc-500">
                  <span>My status</span>
                  <select
                    value={readingStatusManual ? readingStatus : "automatic"}
                    disabled={busy}
                    onChange={(event) => void changeReadingStatus(event.target.value)}
                    className="field h-11 min-w-44 px-3 text-sm disabled:opacity-50"
                    aria-label="My reading status"
                  >
                    <option value="automatic">Automatic</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="dropped">Dropped</option>
                    <option value="plan_to_read">Plan to Read</option>
                  </select>
                </label>
              ) : null}
            </div>
            {inLibrary ? <><AniListTrackingPanel manga={manga} progress={trackingChapter} status={readingStatus} /><MyAnimeListTrackingPanel manga={manga} progress={trackingChapter} status={readingStatus} /></> : null}
            {inLibrary && manga.sourceId !== "import" ? (
              <SourceMigrationPanel
                manga={manga}
                chapters={chapters}
                onMigrated={(target) => { router.push(`/manga/${target.id}`); }}
              />
            ) : null}
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
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-medium ${read ? "text-zinc-500" : "text-zinc-200"}`}>{chapter.title}</span>
                  <span className="mt-0.5 block text-[10px] text-zinc-600">{chapterDate(chapter.publishedAt)}</span>
                </span>
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
