import Image from "next/image";
import Link from "next/link";
import { MockCoverArt } from "@/components/mock-cover-art";
import type { Manga } from "@/types/models";

const progressById: Record<string, number> = {
  "ashen-sky": 66,
  "glass-horizon": 42,
  "quiet-swordsman": 81,
  "second-moon": 37,
  "signal-zero": 58,
  "winter-orchid": 73,
  "city-of-embers": 54,
  "paper-stars": 29,
};

const chapterById: Record<string, number> = {
  "ashen-sky": 134,
  "glass-horizon": 98,
  "quiet-swordsman": 123,
  "second-moon": 104,
  "signal-zero": 88,
  "winter-orchid": 72,
  "city-of-embers": 64,
  "paper-stars": 31,
};

export function MangaCard({ manga, progress }: { manga: Manga; progress?: number }) {
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : progressById[manga.id] ?? 44;
  const chapter = chapterById[manga.id];
  const mock = manga.sourceId === "mock";

  return (
    <Link href={`/manga/${manga.id}`} className="group min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">
      <article className="manga-card h-full">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[13px] bg-[#17151d] ring-1 ring-white/[.08]">
          {mock ? (
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
          <span aria-hidden="true" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg border border-white/10 bg-black/65 text-sm leading-none text-white/80 backdrop-blur-sm">⋮</span>
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-[#07131b]/90 px-2 py-1 text-[9px] font-semibold text-sky-300 shadow-lg backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-sky-300" /> Reading
          </div>
        </div>

        <div className="px-0.5 pb-1 pt-2.5">
          <h2 className="truncate text-[13px] font-semibold tracking-[-.01em] text-zinc-100 transition group-hover:text-white sm:text-sm">{manga.title}</h2>
          <p className="mt-1 truncate text-[10px] text-zinc-500 sm:text-[11px]">{manga.genres.slice(0, 2).join(" · ")}</p>
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
            <span>{chapter ? `Ch. ${chapter}/?` : "In library"}</span>
            <span className="font-mono text-[9px] text-zinc-400">{Math.round(pct)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </article>
    </Link>
  );
}
