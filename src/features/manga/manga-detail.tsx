"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MockCoverArt } from "@/components/mock-cover-art";
import { addLibraryEntry, getLibraryEntries, removeLibraryEntry } from "@/lib/storage/reader-storage";
import type { Chapter, Manga } from "@/types/models";

type ExternalReadLink = { label: string; url: string };

function externalReadLink(description: string): ExternalReadLink | null {
  const match = description.match(/\[([^\]]{1,80})\]\((https?:\/\/[^)\s]+)\)/i);
  if (!match) return null;
  try {
    const url = new URL(match[2]);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { label: match[1].trim() || url.hostname, url: url.toString() };
  } catch {
    return null;
  }
}

function cleanDescription(description: string) {
  return description
    .replace(/\r/g, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sourceName(sourceId: string) {
  if (sourceId === "weebcentral") return "WeebCentral";
  if (sourceId === "comick") return "ComicK";
  if (sourceId === "mangadex") return "MangaDex";
  return "this source";
}

export function MangaDetail({ manga, chapters }: { manga: Manga; chapters: Chapter[] }) {
  const [inLibrary, setInLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const external = useMemo(() => externalReadLink(manga.description), [manga.description]);
  const description = useMemo(() => cleanDescription(manga.description), [manga.description]);
  const provider = sourceName(manga.sourceId);

  useEffect(() => {
    let cancelled = false;
    void getLibraryEntries().then((entries) => {
      if (!cancelled) setInLibrary(entries.some((entry) => entry.mangaId === manga.id));
    });
    return () => { cancelled = true; };
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
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-zinc-500 transition hover:text-pink-300">← Library</Link>

      <section className="mt-5 overflow-hidden rounded-[22px] border border-white/[.08] bg-gradient-to-br from-[#171520] to-[#0f0e15] p-4 shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:p-6 lg:p-8">
        <div className="grid gap-7 sm:grid-cols-[190px_1fr] lg:grid-cols-[230px_1fr] lg:gap-10">
          <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-[16px] bg-zinc-900 shadow-2xl shadow-black/35 ring-1 ring-white/10 sm:mx-0 sm:w-full">
            {manga.sourceId === "mock" ? <MockCoverArt manga={manga} className="h-full w-full" /> : <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill className="object-cover" priority unoptimized />}
          </div>

          <div className="self-center">
            <p className="pixel-kicker text-[9px] text-pink-400">Manga details</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {manga.genres.map((genre) => <span key={genre} className="rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[11px] text-zinc-400">{genre}</span>)}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-.045em] text-white sm:text-4xl">{manga.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">{manga.author || "Unknown author"} · <span className="capitalize">{manga.status}</span> · {provider}</p>
            {description ? <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-zinc-400 sm:text-[15px]">{description}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {chapters[0] ? <Link href={`/reader/${chapters[0].id}`} className="button-primary px-5 py-3 text-sm">Read latest</Link> : null}
              {!chapters.length && external ? <a href={external.url} target="_blank" rel="noreferrer noopener" className="button-primary px-5 py-3 text-sm">Read on {external.label} ↗</a> : null}
              <button type="button" onClick={toggleLibrary} disabled={busy} className="button-secondary px-5 py-3 text-sm font-medium disabled:opacity-50">{inLibrary ? "Remove from library" : "Add to library"}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">Read</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-.03em]">Chapters</h2>
          </div>
          <span className="text-xs text-zinc-600">{chapters.length ? `${chapters.length} available` : "No in-app chapters"}</span>
        </div>
        {chapters.length ? (
          <div className="surface-card mt-4 divide-y divide-white/[.055] overflow-hidden">
            {chapters.map((chapter, index) => (
              <Link key={chapter.id} href={`/reader/${chapter.id}`} className="group flex min-h-14 items-center gap-4 px-4 py-3 text-sm transition hover:bg-white/[.035] sm:px-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.04] font-mono text-[10px] text-zinc-600 group-hover:bg-pink-400/10 group-hover:text-pink-300">{String(chapters.length - index).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-zinc-200">{chapter.title}</span>
                <span className="shrink-0 text-xs text-zinc-600 transition group-hover:text-pink-300">Read →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="surface-card mt-4 px-5 py-8 sm:px-6">
            <p className="text-sm font-semibold text-zinc-200">{provider} does not expose readable English chapters for this entry.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Pachimanga can keep the title in your library, but it will not fabricate chapter links when the upstream source only provides metadata.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {external ? <a href={external.url} target="_blank" rel="noreferrer noopener" className="button-primary px-4 py-2.5 text-sm">Read on {external.label} ↗</a> : null}
              <a href={manga.sourceUrl} target="_blank" rel="noreferrer noopener" className="button-secondary px-4 py-2.5 text-sm">Open {provider} ↗</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
