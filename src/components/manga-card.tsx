"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MockCoverArt } from "@/components/mock-cover-art";
import type { LibraryReadingStatus } from "@/lib/library/library-state";
import type { Manga } from "@/types/models";

const statusLabels: Record<LibraryReadingStatus, string> = {
  reading: "Reading",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
  plan_to_read: "Plan to Read",
};

export function MangaCard({
  manga,
  progress,
  href,
  onRemove,
  lastChapterRead,
  readingStatus = "plan_to_read",
  readingStatusManual = false,
  newChapterCount = 0,
  onStatusChange,
  onOpen,
}: {
  manga: Manga;
  progress?: number;
  href?: string;
  onRemove?: () => void;
  lastChapterRead?: number;
  readingStatus?: LibraryReadingStatus;
  readingStatusManual?: boolean;
  newChapterCount?: number;
  onStatusChange?: (status: LibraryReadingStatus | null) => void;
  onOpen?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : 0;
  const placeholderCover = !manga.coverUrl || imgError;
  const targetHref = href ?? (manga.sourceId === "import" ? null : `/manga/${manga.id}`);
  const publication = manga.status === "complete"
    ? "Publication complete"
    : manga.status === "ongoing"
      ? "Publication ongoing"
      : manga.status === "hiatus"
        ? "Publication hiatus"
        : manga.status === "cancelled"
          ? "Publication cancelled"
          : manga.sourceId === "import" ? "Imported title" : manga.sourceId;
  const hasMenu = Boolean(onRemove || onStatusChange);

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
            onError={() => setImgError(true)}
            unoptimized
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        {newChapterCount > 0 ? (
          <div className="absolute left-2 top-2 rounded-full border border-pink-300/30 bg-[#28101b]/90 px-2 py-1 text-[9px] font-semibold text-pink-200 shadow-lg backdrop-blur-sm">
            {newChapterCount} new
          </div>
        ) : null}
        {hasMenu ? (
          <div
            className="absolute right-2 top-2"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`Options for ${manga.title}`}
              aria-expanded={menuOpen}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen((open) => !open); }}
              className="grid size-7 place-items-center rounded-lg border border-white/10 bg-black/65 text-sm leading-none text-white/80 backdrop-blur-sm"
            >⋮</button>
            {menuOpen ? (
              <div className="absolute right-0 top-8 z-20 min-w-44 overflow-hidden rounded-xl border border-white/10 bg-[#17161f] p-2 shadow-xl">
                {onStatusChange ? (
                  <label className="block px-1 pb-2 text-[10px] font-medium uppercase tracking-[.14em] text-zinc-500">
                    My status
                    <select
                      value={readingStatusManual ? readingStatus : "auto"}
                      onChange={(event) => {
                        const value = event.target.value;
                        onStatusChange(value === "auto" ? null : value as LibraryReadingStatus);
                      }}
                      className="mt-1.5 h-9 w-full rounded-lg border border-white/10 bg-[#111019] px-2 text-xs normal-case tracking-normal text-zinc-200 outline-none focus:border-pink-400/50"
                      aria-label={`Reading status for ${manga.title}`}
                    >
                      <option value="auto">Automatic ({statusLabels[readingStatus]})</option>
                      <option value="reading">Reading</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="dropped">Dropped</option>
                      <option value="plan_to_read">Plan to Read</option>
                    </select>
                  </label>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); onRemove(); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-white/[.06]"
                  >Remove from library</button>
                ) : null}
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
        <p className="mt-1 truncate text-[10px] text-zinc-500 sm:text-[11px]">{statusLabels[readingStatus]} · {publication}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
          <span>{typeof lastChapterRead === "number" && lastChapterRead > 0 ? `Ch. ${lastChapterRead}` : targetHref ? "Open manga" : "Needs source match"}</span>
          <span className="font-mono text-[9px] text-zinc-400">{Math.round(pct)}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </article>
  );

  if (!targetHref) return <div className="group min-w-0 rounded-2xl">{card}</div>;
  return <Link href={targetHref} onClick={() => onOpen?.()} className="group min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">{card}</Link>;
}
