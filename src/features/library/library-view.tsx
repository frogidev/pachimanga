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

  return <div className="min-h-dvh pb-12">
    <section className="hero-room h-[178px] border-b border-pink-300/10 sm:h-[190px]">
      <div className="pixel-city"/>
      <div className="absolute right-[8%] top-5 hidden sm:block"><div className="mb-[-8px] ml-6 rounded-md border border-pink-300/20 bg-[#20131f] px-3 py-2 font-mono text-[9px] leading-4 text-pink-100 shadow-lg">read more ♡<br/>worry less</div><PachiMascot className="h-[132px] w-[150px] drop-shadow-[0_14px_20px_rgba(0,0,0,.35)]"/></div>
      <div className="relative mx-auto flex h-full max-w-[1320px] items-end px-5 pb-7 sm:px-7 lg:px-8">
        <div>
          <div className="pixel-kicker mb-2 text-[9px] text-pink-300">Pachi's reading room</div>
          <h1 className="pixel-title text-[2rem] leading-none text-white sm:text-[2.6rem]">Welcome to <span className="text-pink-400">Pachimanga</span></h1>
          <p className="mt-2 text-sm text-zinc-400">Organize. Read. Sync. Your manga. Everywhere.</p>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your library..." className="w-full rounded-xl border border-white/[.08] bg-[#14121c] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-pink-400/45"/></label>
        <select value={sort} onChange={e=>setSort(e.target.value as SortMode)} className="rounded-xl border border-white/[.08] bg-[#14121c] px-4 py-3 text-sm text-zinc-300"><option value="recent">Recently Updated</option><option value="title">Title</option></select>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{filters.map(x=><button key={x} onClick={()=>setFilter(x)} className={`shrink-0 rounded-lg border px-4 py-2 text-xs transition ${filter===x?'border-pink-300 bg-pink-400 font-semibold text-[#24101b]':'border-white/[.07] bg-[#111019] text-zinc-400 hover:border-white/[.12] hover:text-white'}`}>{x}</button>)}</div>

      <div className="mt-7 flex items-end justify-between"><div><div className="pixel-kicker text-[9px] text-pink-400">▤ collection</div><h2 className="mt-1 text-[1.7rem] font-bold tracking-[-.03em]">Your Library</h2></div><span className="text-xs text-zinc-500">{manga.length} titles</span></div>
      {!ready ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({length:6},(_,i)=><div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[.04]"/>)}</div> : manga.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{manga.map(x=><MangaCard key={x.manga.id} manga={x.manga}/>)}</div> : <div className="paw-pattern mt-10 rounded-2xl border border-dashed border-pink-300/20 p-9 text-center text-sm text-zinc-500"><PachiMascot className="mx-auto mb-2 h-20 w-24"/>No titles match this filter.</div>}

      <div className="paw-pattern mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-pink-400/40 bg-[#111019] p-5 sm:flex-row">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-pink-400/20 bg-pink-400/10 font-mono text-2xl text-pink-300">ฅ</div>
        <div className="flex-1 text-center sm:text-left"><div className="font-semibold text-zinc-100">A new chapter is always a good idea.</div><div className="mt-1 text-sm text-zinc-500">Keep reading, keep collecting, keep enjoying.</div></div>
        <Link href="/browse" className="rounded-xl bg-pink-300 px-5 py-3 text-sm font-bold text-[#25101b] transition hover:bg-pink-200">Browse Manga →</Link>
      </div>
    </div>
  </div>;
}
