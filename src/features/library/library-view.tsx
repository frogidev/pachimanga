"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MangaCard } from "@/components/manga-card";
import Image from "next/image";
import { PixelRoomBanner } from "@/components/pixel-room-banner";
import { isTauriNative } from "@/lib/native/tauri-bridge";
import { getLibraryEntries, removeLibraryEntry } from "@/lib/storage/reader-storage";
import type { LibraryEntry, Manga } from "@/types/models";

type SortMode = "recent" | "title";
type FilterMode = "All" | "Reading" | "Completed" | "On Hold" | "Dropped" | "Plan to Read";
type ViewMode = "grid" | "compact";

const filters: FilterMode[] = ["All", "Reading", "Completed", "On Hold", "Dropped", "Plan to Read"];

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

function GridIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
}

function ListIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none"/></svg>;
}

function PachiHeadPink() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" fill="#ff78b4" />
      <rect x="15" y="3" width="6" height="6" fill="#ff78b4" />
      <rect x="4" y="8" width="16" height="12" fill="#ff9cca" />
      <rect x="6" y="6" width="12" height="14" fill="#ff9cca" />
      <rect x="7" y="11" width="3" height="4" fill="#28101b" />
      <rect x="14" y="11" width="3" height="4" fill="#28101b" />
      <rect x="11" y="15" width="2" height="2" fill="#28101b" />
    </svg>
  );
}

function PawPrint({ className = "" }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 20 20" shapeRendering="crispEdges" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="11" width="8" height="6" />
      <rect x="7" y="10" width="6" height="1" />
      <rect x="2" y="6" width="4" height="4" />
      <rect x="8" y="3" width="4" height="4" />
      <rect x="14" y="6" width="4" height="4" />
    </svg>
  );
}

function BookIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" /></svg>;
}

function subscribeNative() {
  return () => {};
}

export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("All");
  const [view, setView] = useState<ViewMode>("grid");
  const native = useSyncExternalStore(subscribeNative, isTauriNative, () => false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const result = await getLibraryEntries();
        if (!cancelled) {
          setEntries(result);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load your library.");
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void refresh();

    const onLibraryChange = () => void refresh();
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("pachimanga:library-change", onLibraryChange);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("pachimanga:library-change", onLibraryChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const manga = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pairs = entries
      .map((entry) => ({ entry, manga: entry.manga }))
      .filter((item): item is { entry: LibraryEntry; manga: Manga } => Boolean(item.manga))
      .filter((item) => !q || item.manga.title.toLowerCase().includes(q) || item.manga.genres.some((genre) => genre.toLowerCase().includes(q)))
      .filter((item) => {
        if (filter === "All") return true;
        if (filter === "Reading") return item.manga.status === "ongoing" || (item.entry.progress ?? 0) > 0;
        if (filter === "Completed") return item.manga.status === "complete";
        if (filter === "On Hold") return item.manga.status === "hiatus";
        return false;
      });

    pairs.sort((a, b) => sort === "title" ? a.manga.title.localeCompare(b.manga.title) : b.entry.addedAt.localeCompare(a.entry.addedAt));
    return pairs;
  }, [entries, filter, query, sort]);

  const unmatchedImports = useMemo(() => manga.filter((item) => item.manga.sourceId === "import"), [manga]);

  async function removeEntry(entry: LibraryEntry, title: string) {
    if (!window.confirm(`Remove "${title}" from your library?`)) return;
    try {
      await removeLibraryEntry(entry.mangaId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not remove this title.");
    }
  }

  async function purgeUnmatchedImports() {
    const count = unmatchedImports.length;
    if (!count) return;
    if (!window.confirm(`Remove ${count} unmatched imported title${count === 1 ? "" : "s"} from your library? Matched titles are kept.`)) return;
    try {
      for (const item of unmatchedImports) await removeLibraryEntry(item.entry.mangaId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not clear unmatched imports.");
    }
  }

  return (
    <div className="min-h-dvh pb-12">
      <PixelRoomBanner />

      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <header>
          <h1 className="pixel-heading text-[2.1rem] leading-[1.03] text-white sm:text-[2.65rem]">
            Welcome to <span className="text-pink-400">Pachimanga</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">Organize. Read. Sync. Your manga. Everywhere.</p>
        </header>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="app-search relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true"><SearchIcon /></span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your library..."
              className="h-13 w-full rounded-[12px] border border-white/[.09] bg-[#171723] pl-11 pr-20 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-pink-400/45 focus:bg-[#191925]"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/[.08] bg-white/[.035] px-2 py-1 font-sans text-[10px] text-zinc-500 sm:inline-flex">Ctrl K</kbd>
          </label>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="library-sort">Sort library</label>
            <select
              id="library-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-13 min-w-44 rounded-[12px] border border-white/[.09] bg-[#15151f] px-4 text-sm text-zinc-300 outline-none transition hover:border-white/[.14] focus:border-pink-400/45"
            >
              <option value="recent">Recently Updated</option>
              <option value="title">Title A–Z</option>
            </select>
            <div className="flex rounded-[12px] border border-white/[.08] bg-[#12121b] p-1">
              <button onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"} className={`grid size-10 place-items-center rounded-[9px] transition ${view === "grid" ? "bg-pink-400 text-[#271019]" : "text-zinc-500 hover:text-zinc-200"}`}><GridIcon /></button>
              <button onClick={() => setView("compact")} aria-label="Compact view" aria-pressed={view === "compact"} className={`grid size-10 place-items-center rounded-[9px] transition ${view === "compact" ? "bg-pink-400 text-[#271019]" : "text-zinc-500 hover:text-zinc-200"}`}><ListIcon /></button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
                filter === item
                  ? "border-pink-300/70 bg-pink-400 text-[#28101b] shadow-[0_6px_18px_rgba(255,105,170,.13)]"
                  : "border-white/[.08] bg-[#14141d] text-zinc-400 hover:border-white/[.14] hover:text-zinc-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-pink-400/10 text-pink-400" aria-hidden="true"><BookIcon /></span>
            <div>
              <p className="pixel-kicker text-[9px] text-pink-400">Your collection</p>
              <h2 className="mt-0.5 text-[1.65rem] font-bold tracking-[-.035em] text-white">Your Library</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 pb-1">
            {unmatchedImports.length ? (
              <button type="button" onClick={() => void purgeUnmatchedImports()} className="text-xs text-zinc-500 transition hover:text-red-300">Clear {unmatchedImports.length} unmatched import{unmatchedImports.length === 1 ? "" : "s"}</button>
            ) : null}
            <span className="text-xs text-zinc-500">{manga.length} title{manga.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {loadError ? <div className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[.05] px-4 py-3 text-sm text-red-200/80">{loadError}</div> : null}

        {!ready ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2/3.55] animate-pulse rounded-2xl bg-white/[.045]" />)}
          </div>
        ) : manga.length ? (
          <div className={`mt-4 grid gap-x-3 gap-y-5 sm:gap-x-4 ${view === "compact" ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}`}>
            {manga.map(({ manga: title, entry }) => (
              <MangaCard
                key={`${entry.sourceId}-${title.id}`}
                manga={title}
                progress={entry.progress}
                href={native && title.sourceId === "weebcentral" ? `/native/manga/${title.id}` : undefined}
                onRemove={() => void removeEntry(entry, title.title)}
                lastChapterRead={entry.lastChapterRead}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-pink-300/20 bg-[#101018] px-6 text-center">
            <Image
              src="/ai-art/empty-shelves.avif"
              alt="Sleeping cat on an empty manga shelf"
              width={384}
              height={256}
              loading="lazy"
              className="h-32 w-auto rounded-xl object-cover"
            />
            <h3 className="mt-1 font-semibold text-zinc-200">Your library is empty</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">Search the catalog to add manga, or import an existing Tachiyomi, Mihon or Tachimanga library into this account.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/browse" className="button-primary px-4 py-2.5 text-sm">Browse manga</Link>
              <Link href="/import" className="button-secondary px-4 py-2.5 text-sm">Import library</Link>
            </div>
          </div>
        )}

        <div className="promo-strip relative mt-8 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-pink-400/45 px-5 py-5 sm:flex-row">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-pink-400/10"><PachiHeadPink /></div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="font-semibold text-zinc-100">A new chapter is always a good idea.</div>
            <div className="mt-1 text-sm text-zinc-500">Keep reading, keep collecting, keep enjoying!</div>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 items-center gap-3 text-pink-400/40 md:flex">
            <PawPrint className="translate-y-2 rotate-[-12deg]" />
            <PawPrint className="-translate-y-1 rotate-[10deg]" />
          </div>
          <Link href="/browse" className="inline-flex items-center justify-center rounded-[11px] bg-gradient-to-r from-[#ff80b9] to-[#ff9bc9] px-5 py-3 text-sm font-bold text-[#28101b] shadow-[0_10px_24px_rgba(255,112,174,.12)] transition hover:brightness-105">Browse Manga <span className="ml-2">→</span></Link>
        </div>
      </div>
    </div>
  );
}
