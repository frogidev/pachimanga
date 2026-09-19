"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  newChapterCount = 0,
  onOpen,
  collections = [],
  collectionIds = [],
  onCollectionToggle,
  inLibrary = false,
  variant = "grid",
}: {
  manga: Manga;
  progress?: number;
  href?: string;
  onRemove?: () => void;
  lastChapterRead?: number;
  readingStatus?: LibraryReadingStatus;
  newChapterCount?: number;
  onOpen?: () => void;
  collections?: Array<{ id: string; name: string }>;
  collectionIds?: string[];
  onCollectionToggle?: (collectionId: string, member: boolean) => void;
  inLibrary?: boolean;
  variant?: "grid" | "compact";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : 0;
  const missingCover = !manga.coverUrl || imgError;
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
  const hasMenu = Boolean(onRemove || (collections.length && onCollectionToggle));
  const membershipLabel = manga.sourceId === "import" ? "Imported" : "In library";

  const cover = (
    <div className={variant === "compact"
      ? "relative h-24 w-16 shrink-0 overflow-hidden rounded-[11px] bg-[#17151d] ring-1 ring-white/[.08]"
      : "relative aspect-[2/3] overflow-hidden rounded-[13px] bg-[#17151d] ring-1 ring-white/[.08]"}>
      {missingCover ? (
        <div className="grid h-full w-full place-items-center bg-[#12111a] px-2 text-center">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[.12em] text-zinc-500">No cover available</div>
            {variant === "grid" ? <div className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600">{manga.title}</div> : null}
          </div>
        </div>
      ) : (
        <Image
          src={manga.coverUrl}
          alt={`${manga.title} cover`}
          fill
          sizes={variant === "compact" ? "64px" : "(max-width:640px)46vw,(max-width:1024px)29vw,(max-width:1280px)19vw,15vw"}
          className="object-cover transition duration-300 group-hover:scale-[1.025]"
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      {newChapterCount > 0 ? (
        <div className="absolute left-2 top-2 rounded-full border border-pink-300/30 bg-[#28101b]/90 px-2 py-1 text-[9px] font-semibold text-pink-200 shadow-lg backdrop-blur-sm">
          {newChapterCount} new
        </div>
      ) : null}
      {inLibrary ? (
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-[#07131b]/90 px-2 py-1 text-[9px] font-semibold text-sky-300 shadow-lg backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-sky-300" /> {membershipLabel}
        </div>
      ) : null}
    </div>
  );

  const details = variant === "compact" ? (
    <div className="min-w-0 flex-1 py-1 pr-10">
      <h2 className="truncate text-sm font-semibold tracking-[-.01em] text-zinc-100 transition group-hover:text-white">{manga.title}</h2>
      <p className="mt-1 truncate text-[11px] text-zinc-500">{inLibrary ? `${statusLabels[readingStatus]} · ${publication}` : publication}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-zinc-500">
        <span>{inLibrary && typeof lastChapterRead === "number" && lastChapterRead > 0 ? `Ch. ${lastChapterRead}` : targetHref ? "Open manga" : "Needs source match"}</span>
        {inLibrary ? <span className="font-mono text-[9px] text-zinc-400">{Math.round(pct)}%</span> : null}
      </div>
      {inLibrary ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  ) : (
    <div className="px-0.5 pb-1 pt-2.5">
      <h2 className="truncate text-[13px] font-semibold tracking-[-.01em] text-zinc-100 transition group-hover:text-white sm:text-sm">{manga.title}</h2>
      <p className="mt-1 truncate text-[10px] text-zinc-500 sm:text-[11px]">{inLibrary ? `${statusLabels[readingStatus]} · ${publication}` : publication}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>{inLibrary && typeof lastChapterRead === "number" && lastChapterRead > 0 ? `Ch. ${lastChapterRead}` : targetHref ? "Open manga" : "Needs source match"}</span>
        {inLibrary ? <span className="font-mono text-[9px] text-zinc-400">{Math.round(pct)}%</span> : null}
      </div>
      {inLibrary ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );

  const content = variant === "compact"
    ? <div className="flex min-w-0 items-center gap-3">{cover}{details}</div>
    : <>{cover}{details}</>;

  return (
    <div className="group relative min-w-0">
      <article className="manga-card relative h-full">
        {targetHref ? (
          <Link
            href={targetHref}
            onClick={() => onOpen?.()}
            className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70"
          >
            {content}
          </Link>
        ) : content}
        {hasMenu ? (
          <div className="absolute right-2 top-2 z-30">
            <button
              type="button"
              aria-label={`Options for ${manga.title}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/70 text-base leading-none text-white/85 shadow-lg backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70"
            >⋮</button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-40 min-w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#17161f] p-1.5 shadow-xl">
                {collections.length && onCollectionToggle ? (
                  <div className="pb-1">
                    <div className="px-2 py-1 text-[9px] font-medium uppercase tracking-[.14em] text-zinc-500">Collections</div>
                    {collections.map((collection) => {
                      const member = collectionIds.includes(collection.id);
                      return (
                        <button
                          key={collection.id}
                          type="button"
                          aria-pressed={member}
                          onClick={() => onCollectionToggle(collection.id, !member)}
                          className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${member ? "bg-sky-400/10 text-sky-200" : "text-zinc-300 hover:bg-white/[.06]"}`}
                        >
                          <span className="truncate">{collection.name}</span>
                          <span aria-hidden="true">{member ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onRemove(); }}
                    className="block min-h-10 w-full rounded-lg px-2.5 py-2 text-left text-xs text-red-300 transition hover:bg-white/[.06]"
                  >Remove from library</button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
