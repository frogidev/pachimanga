"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MockCoverArt } from "@/components/mock-cover-art";
import type { Manga } from "@/types/models";

export function MangaCard({ manga, progress, href, onRemove }: { manga: Manga; progress?: number; href?: string; onRemove?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : 0;
  const placeholderCover = !manga.coverUrl;
  const targetHref = href ?? (manga.sourceId === "import" ? null : `/manga/${manga.id}`);

  const card = (
    <article className="manga-card h-full">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[13px] bg-[#17151d] ring-1 ring-white/[.08]">
        {placeholderCover ? (
          <MockCoverArt manga={manga} className="h-full w-full transition duration-300 group-hover:scale-[1.018]" />
        ) : (
          <Image
            src={manga.coverUrl}
            alt={`${manga.title} cover`}
            fill
            sizes="(max-width:640px)46vw,(max-width:1024px)29vw,(max-width:1280px)19vw,15vw"
            className="object-cover transition duration-300 group-hover:scale-[1.025]"
            unoptimized
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        {onRemove ? (
          <div className="absolute right-2 top-2" onClick={(event) => event.preventDefault()} onKeyDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label={`Options for ${manga.title}`} aria-expanded={menuOpen} onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }} className="grid size-7 place-items-center rounded-lg border border-white/10 bg-black/65 text-sm leading-none text-white/80 backdrop-blur-sm">⋮</button>
            {menuOpen ? (
              <div className="absolute right-0 top-8 z-10 min-w-36 overflow-hidden rounded-xl border border-white/10 bg-[#17161f] p-1 shadow-xl">
                <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); onRemove(); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-white/[.06]">Remove from library</button>
              </div>
            ) : null}
          </div>
        ) : targetHref ? <span aria-hidden="true" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg border border-white/10 bg-black/65 text-sm leading-none text-white/80 backdrop-blur-sm">⋮</span> : null}
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-[#07131b]/90 px-2 py-1 text-[9px] font-semibold text-sky-300 shadow-lg backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-sky-300" /> {manga.sourceId === "import" ? "Imported" : "In library"}
        </div>
      </div>

      <div className="px-0.5 pb-1 pt-2.5">
        <h2 className="truncate text-[13px] font-semibold tracking-[-.01em] text-zinc-100 transition group-hover:text-white sm:text-sm">{manga.title}</h2>
        <p className="mt-1 truncate text-[10px] text-zinc-500 sm:text-[11px]">{manga.genres.length ? manga.genres.slice(0, 2).join(" · ") : manga.sourceId === "import" ? "Imported title" : manga.sourceId}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
          <span>{targetHref ? "Open manga" : "Needs source match"}</span>
          <span className="font-mono text-[9px] text-zinc-400">{Math.round(pct)}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </article>
  );

  if (!targetHref) return <div className="group min-w-0 rounded-2xl">{card}</div>;
  return <Link href={targetHref} className="group min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">{card}</Link>;
}
