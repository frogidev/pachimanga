'use client';

import { useState } from 'react';
import { parseBackup } from '@/lib/imports';
import { extractTitlesFromImage } from '@/lib/imports/ocr';
import type { ImportManga } from '@/lib/imports/types';
import type { Manga } from '@/types/models';
import { createClient } from '@/lib/supabase/client';

type Candidate = ImportManga & { match?: Manga; selected?: boolean };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ImportPanel() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [matching, setMatching] = useState(false);

  async function backup(file: File) {
    setStatus('Reading backup…');
    try {
      const out = await parseBackup(file);
      setItems(out.manga.map((item) => ({ ...item, selected: true })));
      setWarnings(out.warnings);
      setStatus(`Found ${out.manga.length} titles. Progress is preserved where the backup exposes it.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed');
    }
  }

  async function image(file: File) {
    setStatus('Scanning image on this device…');
    setProgress(0);
    try {
      const titles = await extractTitlesFromImage(file, setProgress);
      setItems(titles.map((title) => ({ title, favorite: true, selected: true })));
      setStatus(`OCR found ${titles.length} candidate titles. Review and match them before importing.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OCR failed');
    }
  }

  async function findMatch(index: number) {
    const item = items[index];
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
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in before importing to cloud sync.');
      const chosen = items.filter((item) => item.selected !== false);
      const rows = chosen.map((manga, index) => ({
        user_id: user.id,
        manga_id: manga.match?.id || `import-${index}-${manga.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
        source_id: manga.match?.sourceId || 'import',
        title: manga.match?.title || manga.title,
        cover_url: manga.match?.coverUrl || null,
        updated_at: new Date().toISOString(),
      }));
      for (const row of rows) {
        const { error } = await sb.from('library_entries').upsert(row, { onConflict: 'user_id,source_id,manga_id' });
        if (error) throw error;
      }
      setStatus(`Imported ${rows.length} titles into your private account.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save import');
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

      {status ? <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3 text-sm text-zinc-400">{status}</div> : null}
      {warnings.map((warning) => <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.05] px-4 py-3 text-sm text-amber-300" key={warning}>{warning}</div>)}

      {items.length > 0 ? (
        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[.06] px-4 py-4 sm:px-5">
            <div>
              <p className="pixel-kicker text-[9px] text-pink-400">Review</p>
              <strong className="mt-1 block text-zinc-100">{items.length} candidates</strong>
            </div>
            <span className="flex-1" />
            <button disabled={matching} className="button-secondary px-4 py-2 text-sm disabled:opacity-50" onClick={() => void matchBatch()}>{matching ? 'Matching…' : 'Match first 20'}</button>
            <button className="button-primary px-4 py-2 text-sm" onClick={() => void save()}>Import selected</button>
          </div>

          <div className="grid gap-2 p-3 sm:p-4">
            {items.slice(0, 150).map((manga, index) => (
              <div className="grid gap-3 rounded-xl border border-white/[.065] bg-[#0e0d14] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={`${manga.title}-${index}`}>
                <input className="size-4 accent-pink-400" type="checkbox" checked={manga.selected !== false} onChange={(event) => patch(index, { selected: event.target.checked })} />
                <div className="min-w-0">
                  <input className="w-full bg-transparent font-medium text-zinc-200 outline-none" value={manga.title} onChange={(event) => patch(index, { title: event.target.value, match: undefined })} />
                  <div className="mt-1 text-xs text-zinc-600">{manga.match ? `Matched: ${manga.match.title} · WeebCentral` : manga.lastChapterRead ? `Imported progress: chapter ${manga.lastChapterRead}${manga.lastPageRead ? ` · page ${manga.lastPageRead}` : ''}` : 'Not matched yet'}</div>
                </div>
                <button onClick={() => void findMatch(index)} className="button-secondary px-3 py-2 text-xs">Find match</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
