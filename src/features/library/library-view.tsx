"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MangaCard } from "@/components/manga-card";
import { PachiCalico } from "@/components/pachi-calico";
import { PixelRoomBanner } from "@/components/pixel-room-banner";
import { shouldRefreshLibrarySource, type LibraryReadingStatus } from "@/lib/library/library-state";
import { isTauriNative } from "@/lib/native/tauri-bridge";
import {
  acknowledgeLibraryUpdates,
  getLibraryDashboardEntries,
} from "@/lib/storage/library-dashboard";
import {
  createLibraryCollection,
  deleteLibraryCollection,
  getLibraryCollectionState,
  setLibraryCollectionMembership,
  type LibraryCollection,
  type LibraryCollectionMembership,
} from "@/lib/storage/library-collections";
import { removeLibraryEntry } from "@/lib/storage/reader-storage";
import type { LibraryEntry, Manga } from "@/types/models";

type SortMode = "recent" | "lastRead" | "progress" | "added" | "title";
type FilterMode = "All" | "Unread Updates" | "Reading" | "Completed" | "On Hold" | "Dropped" | "Plan to Read";
type StatusFilterMode = Exclude<FilterMode, "All" | "Unread Updates">;
type ViewMode = "grid" | "compact";

const filters: FilterMode[] = ["All", "Unread Updates", "Reading", "Completed", "On Hold", "Dropped", "Plan to Read"];
const filterStatus: Record<StatusFilterMode, LibraryReadingStatus> = {
  Reading: "reading",
  Completed: "completed",
  "On Hold": "on_hold",
  Dropped: "dropped",
  "Plan to Read": "plan_to_read",
};
const LIBRARY_VIEW_KEY = "pachimanga:library-view";
const INITIAL_VISIBLE = 48;
const LOAD_MORE_COUNT = 48;

function initialLibraryView(): ViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    const stored = localStorage.getItem(LIBRARY_VIEW_KEY);
    return stored === "compact" ? "compact" : "grid";
  } catch {
    return "grid";
  }
}

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

function GridIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
}

function ListIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none"/></svg>;
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

function mangaHref(manga: Manga, native: boolean) {
  if (manga.sourceId === "import") return null;
  return native && manga.sourceId === "weebcentral" ? `/native/manga/${manga.id}` : `/manga/${manga.id}`;
}

export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("All");
  const [view, setView] = useState<ViewMode>(initialLibraryView);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const native = useSyncExternalStore(subscribeNative, isTauriNative, () => false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [memberships, setMemberships] = useState<LibraryCollectionMembership[]>([]);
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionBusy, setCollectionBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sourceRefreshRunning = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(LIBRARY_VIEW_KEY, view); } catch { /* optional preference */ }
  }, [view]);

  useEffect(() => {
    let cancelled = false;

    const refreshSources = async (current: LibraryEntry[]) => {
      if (sourceRefreshRunning.current) return;
      const stale = current.filter((entry) =>
        entry.sourceId !== "import" && shouldRefreshLibrarySource(entry.lastCheckedAt),
      );
      if (!stale.length) return;
      sourceRefreshRunning.current = true;
      if (!cancelled) setCheckingUpdates(true);
      try {
        for (let index = 0; index < stale.length; index += 2) {
          if (cancelled) break;
          const chunk = stale.slice(index, index + 2);
          await Promise.allSettled(chunk.map(async (entry) => {
            const response = await fetch("/api/library/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mangaId: entry.mangaId }),
            });
            if (!response.ok) throw new Error(`Provider refresh failed with HTTP ${response.status}`);
          }));
        }
        if (!cancelled) {
          const updated = await getLibraryDashboardEntries();
          if (!cancelled) setEntries(updated);
        }
      } finally {
        sourceRefreshRunning.current = false;
        if (!cancelled) setCheckingUpdates(false);
      }
    };

    const refresh = async () => {
      try {
        const [result, collectionState] = await Promise.all([
          getLibraryDashboardEntries(),
          getLibraryCollectionState(),
        ]);
        if (!cancelled) {
          setEntries(result);
          setCollections(collectionState.collections);
          setMemberships(collectionState.memberships);
          setLoadError(null);
          void refreshSources(result);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load your library.");
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void refresh();

    const onLibraryChange = () => void refresh();
    const onFocus = () => void refresh();
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("pachimanga:library-change", onLibraryChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("pachimanga:library-change", onLibraryChange);
      window.removeEventListener("focus", onFocus);
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
        if (filter === "Unread Updates") return Number(item.entry.newChapterCount || 0) > 0;
        return item.entry.readingStatus === filterStatus[filter];
      })
      .filter((item) => {
        if (collectionFilter === "all") return true;
        return memberships.some((membership) =>
          membership.collectionId === collectionFilter
          && membership.sourceId === item.entry.sourceId
          && membership.mangaId === item.entry.mangaId
        );
      });

    pairs.sort((a, b) => {
      if (sort === "title") return a.manga.title.localeCompare(b.manga.title);
      if (sort === "progress") return Number(b.entry.progress || 0) - Number(a.entry.progress || 0);
      if (sort === "lastRead") return (b.entry.lastReadAt || "").localeCompare(a.entry.lastReadAt || "");
      if (sort === "added") return b.entry.addedAt.localeCompare(a.entry.addedAt);
      const aUpdated = a.entry.lastChapterChangeAt || a.entry.addedAt;
      const bUpdated = b.entry.lastChapterChangeAt || b.entry.addedAt;
      return bUpdated.localeCompare(aUpdated);
    });
    return pairs;
  }, [collectionFilter, entries, filter, memberships, query, sort]);

  const visibleManga = manga.slice(0, visibleCount);
  const continueReading = useMemo(() => entries
    .map((entry) => ({ entry, manga: entry.manga }))
    .filter((item): item is { entry: LibraryEntry; manga: Manga } => Boolean(item.manga))
    .filter(({ entry, manga: title }) => title.sourceId !== "import" && Number(entry.progress || 0) > 0 && Number(entry.progress || 0) < 99)
    .sort((a, b) => (b.entry.lastReadAt || b.entry.addedAt).localeCompare(a.entry.lastReadAt || a.entry.addedAt))
    .slice(0, 5), [entries]);
  const unmatchedImports = useMemo(() => entries
    .filter((entry) => entry.manga?.sourceId === "import")
    .map((entry) => ({ entry, manga: entry.manga as Manga })), [entries]);

  async function removeEntry(entry: LibraryEntry, title: string) {
    if (!window.confirm(`Remove "${title}" from your library?`)) return;
    try {
      await removeLibraryEntry(entry.mangaId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not remove this title.");
    }
  }

  function acknowledgeUpdates(entry: LibraryEntry) {
    if (!entry.newChapterCount) return;
    void acknowledgeLibraryUpdates(entry.mangaId, entry.sourceId).catch(() => {
      // Opening the title should not be blocked if acknowledgement cannot sync yet.
    });
  }

  function collectionIdsFor(entry: LibraryEntry) {
    return memberships
      .filter((membership) => membership.sourceId === entry.sourceId && membership.mangaId === entry.mangaId)
      .map((membership) => membership.collectionId);
  }

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name || collectionBusy) return;
    setCollectionBusy(true);
    try {
      const created = await createLibraryCollection(name);
      setCollections((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCollectionFilter(created.id);
      setNewCollectionName("");
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not create the collection.");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function removeCollection() {
    if (collectionFilter === "all" || collectionBusy) return;
    const selected = collections.find((collection) => collection.id === collectionFilter);
    if (!selected) return;
    if (!window.confirm(`Delete collection “${selected.name}”? Titles stay in your library.`)) return;
    setCollectionBusy(true);
    try {
      await deleteLibraryCollection(selected.id);
      setCollections((current) => current.filter((collection) => collection.id !== selected.id));
      setMemberships((current) => current.filter((membership) => membership.collectionId !== selected.id));
      setCollectionFilter("all");
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not delete the collection.");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function toggleCollection(entry: LibraryEntry, collectionId: string, member: boolean) {
    try {
      await setLibraryCollectionMembership({
        collectionId,
        sourceId: entry.sourceId,
        mangaId: entry.mangaId,
        member,
      });
      setMemberships((current) => {
        const without = current.filter((membership) =>
          !(membership.collectionId === collectionId
            && membership.sourceId === entry.sourceId
            && membership.mangaId === entry.mangaId)
        );
        return member
          ? [...without, { collectionId, sourceId: entry.sourceId, mangaId: entry.mangaId }]
          : without;
      });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not update the collection.");
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
              <option value="lastRead">Last Read</option>
              <option value="progress">Progress</option>
              <option value="added">Recently Added</option>
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

        <section className="mt-3 rounded-2xl border border-white/[.07] bg-[#111019] p-3" aria-label="Library collections">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setCollectionFilter("all")}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${collectionFilter === "all" ? "border-sky-300/55 bg-sky-300/10 text-sky-200" : "border-white/[.08] text-zinc-500 hover:text-zinc-200"}`}
              >
                All collections
              </button>
              {collections.map((collection) => (
                <button
                  type="button"
                  key={collection.id}
                  onClick={() => setCollectionFilter(collection.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${collectionFilter === collection.id ? "border-sky-300/55 bg-sky-300/10 text-sky-200" : "border-white/[.08] text-zinc-500 hover:text-zinc-200"}`}
                >
                  {collection.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="new-library-collection">New collection name</label>
              <input
                id="new-library-collection"
                value={newCollectionName}
                maxLength={50}
                onChange={(event) => setNewCollectionName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void createCollection(); }}
                placeholder="New collection"
                className="field min-w-0 flex-1 px-3 py-2 text-xs lg:w-44"
              />
              <button type="button" disabled={!newCollectionName.trim() || collectionBusy} onClick={() => void createCollection()} className="button-secondary px-3 py-2 text-xs disabled:opacity-40">Add</button>
              {collectionFilter !== "all" ? (
                <button type="button" disabled={collectionBusy} onClick={() => void removeCollection()} className="rounded-xl border border-red-300/15 px-3 py-2 text-xs text-red-300 hover:bg-red-400/[.06] disabled:opacity-40">Delete</button>
              ) : null}
            </div>
          </div>
        </section>

        {ready && continueReading.length > 0 && !query && filter === "All" && collectionFilter === "all" ? (
          <section className="mt-7" aria-labelledby="continue-reading-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="pixel-kicker text-[9px] text-sky-300">Pick up where you left off</p>
                <h2 id="continue-reading-heading" className="mt-1 text-lg font-semibold text-zinc-100">Continue Reading</h2>
              </div>
              <button type="button" onClick={() => setSort("lastRead")} className="text-xs text-zinc-500 transition hover:text-zinc-200">Sort by last read</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {continueReading.map(({ entry, manga: title }) => {
                const href = mangaHref(title, native);
                if (!href) return null;
                return (
                  <Link key={`continue-${entry.sourceId}-${entry.mangaId}`} href={href} onClick={() => acknowledgeUpdates(entry)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/[.08] bg-[#12121b] p-2.5 transition hover:border-sky-300/25 hover:bg-[#151520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-[#17151d]">
                      {title.coverUrl ? <Image src={title.coverUrl} alt="" fill sizes="44px" unoptimized className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-zinc-200 group-hover:text-white">{title.title}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">{Math.round(Number(entry.progress || 0))}% read</div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.min(100, Math.max(0, Number(entry.progress || 0)))}%` }} /></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-pink-400/10 text-pink-400" aria-hidden="true"><BookIcon /></span>
            <div>
              <p className="pixel-kicker text-[9px] text-pink-400">Your collection</p>
              <h2 className="mt-0.5 text-[1.65rem] font-bold tracking-[-.035em] text-white">Your Library</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 pb-1">
            {checkingUpdates ? <span className="text-xs text-zinc-600">Checking updates…</span> : null}
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
          <>
            <div className={view === "compact"
              ? "mt-4 grid grid-cols-1 gap-2"
              : "mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}>
              {visibleManga.map(({ manga: title, entry }) => (
                <MangaCard
                  key={`${entry.sourceId}-${title.id}`}
                  manga={title}
                  progress={entry.progress}
                  href={native && title.sourceId === "weebcentral" ? `/native/manga/${title.id}` : undefined}
                  onRemove={() => void removeEntry(entry, title.title)}
                  lastChapterRead={entry.lastChapterRead}
                  readingStatus={entry.readingStatus}
                  newChapterCount={entry.newChapterCount}
                  onOpen={() => acknowledgeUpdates(entry)}
                  inLibrary
                  variant={view === "compact" ? "compact" : "grid"}
                  collections={collections}
                  collectionIds={collectionIdsFor(entry)}
                  onCollectionToggle={(collectionId, member) => void toggleCollection(entry, collectionId, member)}
                />
              ))}
            </div>
            {visibleCount < manga.length ? (
              <div className="mt-7 flex justify-center">
                <button type="button" onClick={() => setVisibleCount((count) => count + LOAD_MORE_COUNT)} className="button-secondary px-5 py-2.5 text-sm">Show more ({manga.length - visibleCount} remaining)</button>
              </div>
            ) : null}
          </>
        ) : loadError ? null : (
          <div className="surface-card mt-4 flex flex-col gap-3 px-5 py-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong className="text-zinc-200">{entries.length ? "0 titles match the current library filters." : "0 titles are stored in this account."}</strong>
              <span className="ml-2">{entries.length ? "The loaded account data has no rows matching this view." : "The signed-in library returned no titles."}</span>
            </p>
            {entries.length ? (
              <button type="button" onClick={() => { setFilter("All"); setCollectionFilter("all"); setQuery(""); }} className="button-secondary shrink-0 px-3 py-2 text-xs">Clear filters</button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <Link href="/browse" className="button-primary px-3 py-2 text-xs">Browse live sources</Link>
                <Link href="/import" className="button-secondary px-3 py-2 text-xs">Import account data</Link>
              </div>
            )}
          </div>
        )}

        <div className="promo-strip relative mt-8 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-pink-400/45 px-5 py-5 sm:flex-row">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-pink-400/10"><PachiCalico variant="head" className="size-10" /></div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="font-semibold text-zinc-100">A new chapter is always a good idea.</div>
            <div className="mt-1 text-sm text-zinc-500">Keep reading, keep collecting, keep enjoying!</div>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 items-center gap-3 text-pink-400/40 md:flex">
            <PawPrint className="translate-y-2 rotate-[-12deg]" />
            <PawPrint className="-translate-y-1 rotate-[10deg]" />
          </div>
          <Link href="/browse" className="inline-flex items-center justify-center rounded-[11px] bg-gradient-to-r from-[#fb923c] to-[#fdba74] px-5 py-3 text-sm font-bold text-[#2a1503] shadow-[0_10px_24px_rgba(249,115,22,.14)] transition hover:brightness-105">Browse Manga <span className="ml-2">→</span></Link>
        </div>
      </div>
    </div>
  );
}
