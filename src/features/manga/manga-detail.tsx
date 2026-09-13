"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addLibraryEntry,
  getLibraryEntries,
  removeLibraryEntry,
} from "@/lib/storage/reader-storage";
import type { Chapter, Manga } from "@/types/models";

export function MangaDetail({ manga, chapters }: { manga: Manga; chapters: Chapter[] }) {
  const [inLibrary, setInLibrary] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getLibraryEntries().then((entries) => {
      if (!cancelled) {
        setInLibrary(entries.some((entry) => entry.mangaId === manga.id));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [manga.id]);

  async function toggleLibrary() {
    setBusy(true);
    try {
      if (inLibrary) await removeLibraryEntry(manga.id);
      else await addLibraryEntry(manga.id, manga.sourceId, manga);
      const entries = await getLibraryEntries();
      setInLibrary(entries.some((entry) => entry.mangaId === manga.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300">← Library</Link>
      <section className="mt-5 grid gap-6 sm:grid-cols-[190px_1fr] lg:grid-cols-[230px_1fr] lg:gap-10">
        <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl shadow-black/40 ring-1 ring-white/10 sm:mx-0 sm:w-full">
          <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill className="object-cover" priority unoptimized />
        </div>
        <div className="self-end">
          <div className="mb-3 flex flex-wrap gap-2">
            {manga.genres.map((genre) => (
              <span key={genre} className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">{genre}</span>
            ))}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{manga.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{manga.author} · {manga.status}</p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">{manga.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {chapters[0] ? (
              <Link href={`/reader/${chapters[0].id}`} className="rounded-xl bg-pink-400 px-5 py-3 text-sm font-semibold text-[#28101c] transition hover:bg-pink-300">
                Read latest
              </Link>
            ) : null}
            <button
              type="button"
              onClick={toggleLibrary}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              {inLibrary ? "Remove from library" : "Add to library"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-white/8 pt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chapters</h2>
          <span className="text-xs text-zinc-600">{chapters.length} available</span>
        </div>
        <div className="mt-4 divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/reader/${chapter.id}`}
              className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-white/5 sm:px-5"
            >
              <span className="font-medium text-zinc-200">{chapter.title}</span>
              <span className="shrink-0 text-xs text-zinc-600">Read →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
