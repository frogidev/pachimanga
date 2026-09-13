"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { PachiMascot } from "@/components/pachi-mascot";
import { MOCK_MANGA } from "@/lib/mock-data";
import { getLibraryEntries, seedLibrary } from "@/lib/storage/reader-storage";
import type { LibraryEntry, Manga } from "@/types/models";

type SortMode = "recent" | "title";
const filters = ["All", "Reading", "Completed", "On Hold", "Dropped", "Plan to Read"];

export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    void seedLibrary(MOCK_MANGA.slice(0, 6).map(m => m.id)).then(current => { if (!cancelled) { setEntries(current); setReady(true); } });
    const on = () => void getLibraryEntries().then(res => { if (!cancelled) setEntries(res); });
    window.addEventListener("pachimanga:library-change", on);
    return () => { cancelled = true; window.removeEventListener("pachimanga:library-change", on); };
  }, []);

  const manga = useMemo(() => {
    const mock = new Map(MOCK_MANGA.map(m => [m.id, m]));
    const pairs = entries.map(e => ({ entry:e, manga:e.manga || mock.get(e.mangaId) })).filter((x):x is {entry:LibraryEntry;manga:Manga} => Boolean(x.manga)).filter(x => x.manga.title.toLowerCase().includes(query.trim().toLowerCase()));
    pairs.sort((a,b) => sort === "title" ? a.manga.title.localeCompare(b.manga.title) : b.entry.addedAt.localeCompare(a.entry.addedAt));
    return pairs;
  }, [entries, query, sort]);

  return <div className="min-h-dvh pb-10">
    <section className="pachi-hero h-[210px] border-b border-pink-300/10 sm:h-[230px]">
      <span className="pixel-star left-[25%] top-12"/><span className="pixel-star right-[22%] top-20"/>
      <div className="absolute bottom-0 right-4 hidden h-44 w-52 sm:block lg:right-[8%]"><PachiMascot className="h-full w-full translate-y-8 opacity-90"/></div>
      <div className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-8 sm:px-8">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[.28em] text-pink-300">Pachi's reading room · 8-bit edition</div>
        <h1 className="pixel-title text-3xl text-white sm:text-5xl">Welcome to <span className="text-pink-400">Pachimanga</span></h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">Organize. Read. Sync. Your manga. Everywhere.</p>
      </div>
    </section>

    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your library..." className="w-full rounded-xl border border-white/10 bg-[#15131e] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-pink-400/50"/></div>
        <select value={sort} onChange={e=>setSort(e.target.value as SortMode)} className="rounded-xl border border-white/10 bg-[#15131e] px-4 py-3 text-sm text-zinc-300"><option value="recent">Recently Updated</option><option value="title">Title</option></select>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{filters.map(x=><button key={x} onClick={()=>setFilter(x)} className={`shrink-0 rounded-lg border px-4 py-2 text-xs ${filter===x?'border-pink-300 bg-pink-400 text-[#24101b]':'border-white/8 bg-[#14121b] text-zinc-400 hover:text-white'}`}>{x}</button>)}</div>

      <div className="mt-7 flex items-end justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.24em] text-pink-400">▤ collection</div><h2 className="mt-1 text-2xl font-bold">Your Library</h2></div><span className="text-xs text-zinc-500">{manga.length} titles</span></div>
      {!ready ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({length:10},(_,i)=><div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5"/>)}</div> : manga.length ? <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">{manga.map(x=><MangaCard key={x.manga.id} manga={x.manga}/>)}</div> : <div className="paw-bg mt-12 rounded-xl border border-dashed border-pink-300/20 p-10 text-center text-sm text-zinc-500"><PachiMascot className="mx-auto h-24 w-28"/>No titles match this filter.</div>}

      <div className="paw-bg mt-9 flex flex-col items-center gap-4 rounded-xl border border-dashed border-pink-400/50 bg-[#121019] p-5 sm:flex-row">
        <div className="grid size-12 shrink-0 place-items-center border border-pink-400/30 bg-pink-400/10 font-mono text-2xl text-pink-300">ฅ</div>
        <div className="flex-1 text-center sm:text-left"><div className="font-semibold text-zinc-100">A new chapter is always a good idea.</div><div className="mt-1 text-sm text-zinc-500">Keep reading, keep collecting, keep enjoying.</div></div>
        <Link href="/browse" className="rounded-lg bg-pink-300 px-5 py-3 text-sm font-bold text-[#25101b] hover:bg-pink-200">Browse Manga →</Link>
      </div>
      <div className="mt-5 text-center font-mono text-[10px] text-zinc-600">made with ♡ for manga lovers · calico approved</div>
    </div>
  </div>;
}
