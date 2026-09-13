"use client";

import { useEffect, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PageHeading } from "@/components/page-heading";
import { MOCK_MANGA } from "@/lib/mock-data";
import type { Manga } from "@/types/models";

const DEFAULT_STATUS = "Search WeebCentral or browse the offline demo catalog.";

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

    const c = new AbortController();
    const t = window.setTimeout(async () => {
      setStatus("Searching WeebCentral…");
      try {
        const r = await fetch(`/api/source/weebcentral/search?q=${encodeURIComponent(q)}`, {
          signal: c.signal,
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Search failed");
        setResults(j.items || []);
        setStatus(
          `${j.items?.length || 0} result${j.items?.length === 1 ? "" : "s"} from WeebCentral`
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setStatus(e instanceof Error ? e.message : "Search unavailable");
        }
      }
    }, 320);

    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeading title="Browse" subtitle={status} />
      <div className="mt-6 flex max-w-2xl items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-pink-400/40">
        <span className="mr-3 text-zinc-600">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search WeebCentral"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
          autoComplete="off"
        />
      </div>
      <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {results.map((m) => (
          <MangaCard key={m.id} manga={m} />
        ))}
      </div>
    </div>
  );
}
