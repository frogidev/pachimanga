'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseBackup } from '@/lib/imports';
import { extractTitlesFromImage } from '@/lib/imports/ocr';
import { parseSeriesIdFromUrl } from '@/sources/weebcentral/endpoints';
import type { ImportManga } from '@/lib/imports/types';
import { addLibraryEntry, getLibraryEntries } from '@/lib/storage/reader-storage';
import type { Manga } from '@/types/models';

type Candidate = ImportManga & { match?: Manga; selected?: boolean };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function weebCentralMatch(item: ImportManga): Manga | null {
  if (!item.sourceUrl) return null;
  const seriesId = parseSeriesIdFromUrl(item.sourceUrl);
  if (!seriesId) return null;
  return {
    id: `wc-${seriesId}`,
    sourceId: 'weebcentral',
    title: item.title,
    alternativeTitles: [],
    description: '',
    coverUrl: '',
    author: '',
    artist: '',
    status: 'unknown',
    genres: [],
    sourceUrl: item.sourceUrl,
  };
}

async function readExistingLibrary(): Promise<Manga[]> {
  try {
    const entries = await getLibraryEntries();
    return entries.map((entry) => entry.manga).filter((manga): manga is Manga => Boolean(manga));
  } catch {
    return [];
  }
}

function linkCandidate(item: ImportManga, library: Manga[]): Manga | null {
  const direct = weebCentralMatch(item);
  if (direct) return direct;
  const key = item.title.trim().toLowerCase();
  return library.find((manga) => manga.title.trim().toLowerCase() === key) ?? null;
}

function importedManga(item: Candidate, index: number): Manga {
  if (item.match) return item.match;
  const id = `import-${index}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'title'}`;
  return {
    id,
    sourceId: 'import',
    title: item.title,
    alternativeTitles: [],
    description: '',
    coverUrl: '',
    author: '',
    artist: '',
    status: 'unknown',
    genres: [],
    sourceUrl: '',
  };
}

export function ImportPanel() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [matching, setMatching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  async function backup(file: File) {
    setStatus('Reading backup…');
    try {
      const out = await parseBackup(file);
      const library = await readExistingLibrary();
      const linked = out.manga.map((item) => ({ ...item, selected: true, match: linkCandidate(item, library) ?? undefined }));
      setItems(linked);
      setWarnings(out.warnings);
      const auto = linked.filter((item) => item.match?.sourceId === 'weebcentral').length;
      const dupes = linked.filter((item) => item.match && item.match.sourceId !== 'weebcentral').length;
      setStatus(`Found ${out.manga.length} titles${auto ? `, ${auto} linked to WeebCentral` : ''}${dupes ? `, ${dupes} already in your library` : ''}. Review and match them before importing.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed');
    }
  }

  async function image(file: File) {
    setStatus('Scanning image on this device…');
    setProgress(0);
    try {
      const titles = await extractTitlesFromImage(file, setProgress);
      setItems(titles.map((title) => ({ title, favorite: true, selected: false })));
      setStatus(`OCR found ${titles.length} candidate titles. Tick only the real manga titles, then match and import.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OCR failed');
    }
  }

  async function findMatch(index: number) {
    const item = items[index];
    const direct = weebCentralMatch(item);
    if (direct) {
      setItems((value) => value.map((candidate, i) => i === index ? { ...candidate, match: direct } : candidate));
      return true;
    }
    const response = await fetch(`/api/source/weebcentral/search?q=${encodeURIComponent(item.title)}`);
    const body = await response.json();
    const match = (body.items || [])[0] as Manga | undefined;
    setItems((value) => value.map((candidate, i) => i === index ? { ...candidate, match } : candidate));
    return Boolean(match);
  }

  async function matchBatch() {
    setMatching(true);
    setStatus('Matching titles against WeebCentral…');
    let found = 0;
    try {
      for (let i = 0; i < Math.min(items.length, 20); i += 1) {
        if (await findMatch(i)) found += 1;
        await sleep(250);
      }
      setStatus(`Matched ${found} of the first ${Math.min(items.length, 20)} titles. You can match additional rows individually.`);
    } finally {
      setMatching(false);
    }
  }

  async function save() {
    const chosen = items.filter((item) => item.selected !== false);
    if (!chosen.length) {
      setStatus('Select at least one title first.');
      return;
    }
    setImporting(true);
    setImportedCount(null);
    const failed: string[] = [];
    try {
      for (let index = 0; index < chosen.length; index += 1) {
        setStatus(`Importing ${index + 1} of ${chosen.length} titles into your account…`);
        try {
          const manga = importedManga(chosen[index], index);
          await addLibraryEntry(manga.id, manga.sourceId, manga);
        } catch (error) {
          failed.push(`${chosen[index].title} (${error instanceof Error ? error.message : 'failed'})`);
        }
      }
      const done = chosen.length - failed.length;
      setImportedCount(done);
      setStatus(
        failed.length
          ? `Imported ${done} of ${chosen.length} titles. Failed: ${failed.slice(0, 5).join('; ')}${failed.length > 5 ? ` (+${failed.length - 5} more)` : ''}`
          : `Imported ${done} titles into your private library. Unmatched titles remain marked as imported until you match them to a source.`
      );
    } finally {
      setImporting(false);
    }
  }

  function patch(index: number, value: Partial<Candidate>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item));
  }

  return (
    <div className="mt-6 grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="surface-card group cursor-pointer p-5 transition hover:border-pink-300/20 hover:bg-[#171520]">
          <div className="grid size-11 place-items-center rounded-xl bg-pink-400/10 text-xl text-pink-300">⌕</div>
          <h2 className="mt-4 font-semibold text-zinc-100">Scan screenshot or image</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">OCR runs in your browser. The image itself is not uploaded to Pachimanga.</p>
          <input className="mt-5 block w-full text-xs text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-pink-400 file:px-3 file:py-2 file:font-semibold file:text-[#28101c]" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void image(event.target.files[0])} />
          {progress > 0 && progress < 1 ? <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-sky-300" style={{ width: `${progress * 100}%` }} /></div> : null}
        </label>

        <label className="surface-card group cursor-pointer p-5 transition hover:border-sky-300/20 hover:bg-[#171520]">
          <div className="grid size-11 place-items-center rounded-xl bg-sky-400/10 text-xl text-sky-300">⇩</div>
          <h2 className="mt-4 font-semibold text-zinc-100">Import app backup</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Tachiyomi/Mihon <code>.tachibk</code>, Tachimanga <code>.tmb</code>, or JSON backups.</p>
          <input className="mt-5 block w-full text-xs text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-300 file:px-3 file:py-2 file:font-semibold file:text-[#10202a]" type="file" accept=".tachibk,.proto.gz,.gz,.tmb,.json" onChange={(event) => event.target.files?.[0] && void backup(event.target.files[0])} />
        </label>
      </div>

      {status ? <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3 text-sm text-zinc-400">{status}{importedCount !== null && importedCount > 0 ? <> <Link href="/library" className="text-pink-300 hover:text-pink-200">View your library →</Link></> : null}</div> : null}
      {warnings.map((warning) => <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.05] px-4 py-3 text-sm text-amber-300" key={warning}>{warning}</div>)}

      {items.length > 0 ? (
        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[.06] px-4 py-4 sm:px-5">
            <div>
              <p className="pixel-kicker text-[9px] text-pink-400">Review</p>
              <strong className="mt-1 block text-zinc-100">{items.length} candidates</strong>
            </div>
            <span className="flex-1" />
            <button className="button-secondary px-4 py-2 text-sm disabled:opacity-50" disabled={importing || matching} onClick={() => setItems((value) => value.map((candidate) => ({ ...candidate, selected: true })))}>Select all</button>
            <button className="button-secondary px-4 py-2 text-sm disabled:opacity-50" disabled={importing || matching} onClick={() => setItems((value) => value.map((candidate) => ({ ...candidate, selected: false })))}>Select none</button>
            <button disabled={matching || importing} className="button-secondary px-4 py-2 text-sm disabled:opacity-50" onClick={() => void matchBatch()}>{matching ? 'Matching…' : 'Match first 20'}</button>
            <button disabled={importing} className="button-primary px-4 py-2 text-sm disabled:opacity-50" onClick={() => void save()}>{importing ? 'Importing…' : 'Import selected'}</button>
          </div>

          <div className="grid gap-2 p-3 sm:p-4">
            {items.slice(0, 150).map((manga, index) => (
              <div className="grid gap-3 rounded-xl border border-white/[.065] bg-[#0e0d14] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={`${manga.title}-${index}`}>
                <input className="size-4 accent-pink-400" type="checkbox" checked={manga.selected !== false} onChange={(event) => patch(index, { selected: event.target.checked })} />
                <div className="min-w-0">
                  <input className="w-full bg-transparent font-medium text-zinc-200 outline-none" value={manga.title} onChange={(event) => patch(index, { title: event.target.value, match: undefined })} />
                  <div className="mt-1 text-xs text-zinc-600">{manga.match ? `Matched: ${manga.match.title} · ${manga.match.sourceId === 'weebcentral' ? 'WeebCentral' : 'your library'}` : manga.lastChapterRead ? `Imported progress reference: chapter ${manga.lastChapterRead}${manga.lastPageRead ? ` · page ${manga.lastPageRead}` : ''}` : 'Not matched yet'}</div>
                </div>
                <button onClick={() => void findMatch(index)} className="button-secondary px-3 py-2 text-xs">Find match</button>
                <button onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="rounded-xl px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[.06] hover:text-red-300" aria-label={`Discard ${manga.title}`}>✕</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
