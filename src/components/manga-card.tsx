import Image from "next/image";
import Link from "next/link";
import type { Manga } from "@/types/models";

export function MangaCard({ manga, progress }: { manga: Manga; progress?: number }) {
  return (
    <Link href={`/manga/${manga.id}`} className="group min-w-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg shadow-black/20 ring-1 ring-white/8 transition group-hover:-translate-y-0.5 group-hover:ring-white/15">
        <Image
          src={manga.coverUrl}
          alt={`${manga.title} cover`}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 23vw, 14vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
        {typeof progress === "number" && progress > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        ) : null}
      </div>
      <div className="px-0.5 pt-2.5">
        <h2 className="truncate text-sm font-medium text-zinc-100">{manga.title}</h2>
        <p className="mt-1 truncate text-xs text-zinc-500">{manga.genres.slice(0, 2).join(" · ")}</p>
      </div>
    </Link>
  );
}
