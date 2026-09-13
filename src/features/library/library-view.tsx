"use client";

import { useEffect, useMemo, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PageHeading } from "@/components/page-heading";
import { MOCK_MANGA } from "@/lib/mock-data";
import { getLibraryEntries, seedLibrary } from "@/lib/storage/reader-storage";
import type { LibraryEntry, Manga } from "@/types/models";

type SortMode = "recent" | "title";

export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void seedLibrary(MOCK_MANGA.slice(0, 6).map((m) => m.id)).then((current) => {
      if (cancelled) return;
      setEntries(current);
      setReady(true);
    });

    const on = () => {
      void getLibraryEntries().then((res) => {
        if (!cancelled) setEntries(res);
      });
    };

    window.addEventListener("pachimanga:library-change", on);
    return () => {
      cancelled = true;
      window.removeEventListener("pachimanga:library-change", on);
    };
  }, []);

  const manga = useMemo(() => {
    const mock = new Map(MOCK_MANGA.map((m) => [m.id, m]));
    const pairs = entries
      .map((e) => ({ entry: e, manga: e.manga || mock.get(e.mangaId) }))
      .filter((x): x is { entry: LibraryEntry; manga: Manga } => Boolean(x.manga))
      .filter((x) => x.manga.title.toLowerCase().includes(query.trim().toLowerCase()));

    pairs.sort((a, b) =>
      sort === "title"
        ? a.manga.title.localeCompare(b.manga.title)
        : b.entry.addedAt.localeCompare(a.entry.addedAt)
    );
    return pairs;
  }, [entries, query, sort]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeading
        title="Library"
        subtitle={`${entries.length} titles saved on this device`}
        actions={
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter library"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-pink-400/40 sm:w-52"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300"
            >
              <option value="recent">Recent</option>
              <option value="title">Title</option>
            </select>
          </div>
        }
      />
      {!ready ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : manga.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {manga.map((x) => (
            <MangaCard key={x.manga.id} manga={x.manga} />
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
          No titles match this filter.
        </div>
      )}
    </div>
  );
}
