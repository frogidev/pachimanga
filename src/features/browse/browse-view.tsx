"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PageHeading } from "@/components/page-heading";
import { MOCK_MANGA } from "@/lib/mock-data";
import type { Manga } from "@/types/models";

const DEFAULT_STATUS = "Search WeebCentral or browse the offline demo catalog.";

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
}

export function BrowseView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>(MOCK_MANGA);
  const [status, setStatus] = useState(DEFAULT_STATUS);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      const resetTimer = window.setTimeout(() => {
        setResults(MOCK_MANGA);
        setStatus(DEFAULT_STATUS);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("Searching WeebCentral…");
      try {
        const response = await fetch(`/api/source/weebcentral/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Search failed");
        setResults(body.items || []);
        setStatus(`${body.items?.length || 0} result${body.items?.length === 1 ? "" : "s"} from WeebCentral`);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus(error instanceof Error ? error.message : "Search unavailable");
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <PageHeading
        eyebrow="Discover"
        title="Browse manga"
        subtitle={status}
        actions={<span className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1.5 text-[11px] text-zinc-400"><span className="size-1.5 rounded-full bg-emerald-400" /> WeebCentral + offline demo</span>}
      />

      <div className="mt-6 rounded-2xl border border-white/[.07] bg-[#111019] p-3 sm:p-4">
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true"><SearchIcon /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, genre, or keyword"
            className="field h-13 w-full pl-11 pr-4 text-sm placeholder:text-zinc-600"
            autoComplete="off"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-600">
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">Try: fantasy</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">romance</span>
          <span className="rounded-full bg-white/[.035] px-2.5 py-1">action</span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="pixel-kicker text-[9px] text-pink-400">Catalog</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.03em] text-white">{query.trim() ? "Search results" : "Recommended for you"}</h2>
        </div>
        <span className="text-xs text-zinc-500">{results.length} title{results.length === 1 ? "" : "s"}</span>
      </div>

      {results.length ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((manga) => <MangaCard key={`${manga.sourceId}-${manga.id}`} manga={manga} />)}
        </div>
      ) : (
        <div className="surface-card mt-6 px-6 py-14 text-center">
          <div className="text-3xl">⌕</div>
          <h3 className="mt-3 font-semibold text-zinc-200">No matching manga</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Try a shorter title or remove punctuation. Source search results depend on what WeebCentral currently exposes.</p>
        </div>
      )}
    </div>
  );
}
