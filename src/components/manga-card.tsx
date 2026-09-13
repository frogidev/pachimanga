import Image from "next/image";
import Link from "next/link";
import type { Manga } from "@/types/models";

export function MangaCard({ manga, progress }: { manga: Manga; progress?: number }) {
  return <Link href={`/manga/${manga.id}`} className="group min-w-0 rounded-xl border border-white/8 bg-[#121019] p-2 transition hover:-translate-y-1 hover:border-pink-300/25 hover:shadow-[0_12px_32px_rgba(0,0,0,.35)]">
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/8">
      <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill sizes="(max-width:640px) 45vw,(max-width:1024px) 23vw,14vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" unoptimized/>
      <div className="absolute left-2 bottom-2 rounded bg-[#111018]/90 px-2 py-1 font-mono text-[9px] text-sky-300 ring-1 ring-sky-300/20">● Reading</div>
      <div className="absolute right-2 top-2 grid size-7 place-items-center rounded bg-black/70 text-xs text-zinc-300">⋮</div>
    </div>
    <div className="px-0.5 pt-2.5"><h2 className="truncate text-sm font-semibold text-zinc-100">{manga.title}</h2><p className="mt-1 truncate text-[11px] text-zinc-500">{manga.genres.slice(0,2).join(" · ")}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-pink-400" style={{width:`${typeof progress==='number'?Math.min(100,Math.max(8,progress)):38}%`}}/></div></div>
  </Link>;
}
