'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { SyncStatusPanel } from '@/components/sync-status';
import { DEFAULT_READER_SETTINGS, loadReaderSettings, saveReaderSettings } from '@/lib/storage/reader-storage';
import type { ReaderSettings } from '@/types/models';

export default function SettingsPage() {
  const [s, setS] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void loadReaderSettings().then((settings) => {
      if (!cancelled) setS(settings);
    });
    return () => { cancelled = true; };
  }, []);

  function patch(p: Partial<ReaderSettings>) {
    setS((value) => {
      const next = { ...value, ...p };
      saveReaderSettings(next);
      document.documentElement.dataset.theme = next.theme;
      try { localStorage.setItem('pachimanga-theme', next.theme); } catch { /* private mode */ }
      return next;
    });
  }

  return (
    <div className="app-page max-w-4xl">
      <PageHeading eyebrow="Preferences" title="Settings" subtitle="Tune your reader and manage your private Pachimanga account." />
      <div className="mt-6 grid gap-4">
        <SyncStatusPanel />

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="pixel-kicker text-[9px] text-pink-400">Reader</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-100">Reading behavior</h2>
              <p className="mt-1 text-sm text-zinc-500">Set comfortable defaults for long vertical chapters. These preferences sync to your account.</p>
            </div>
            <span className="rounded-full bg-pink-400/10 px-2.5 py-1 font-mono text-[9px] text-pink-300">{s.baseSpeedPxPerSecond}px/s</span>
          </div>

          <label className="mt-6 block text-sm text-zinc-400">
            Base auto-scroll speed
            <input
              className="mt-3 w-full accent-pink-400"
              type="range"
              min="30"
              max="500"
              step="10"
              value={s.baseSpeedPxPerSecond}
              onChange={(e) => patch({ baseSpeedPxPerSecond: Number(e.target.value) })}
            />
          </label>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[.12em] text-zinc-600">Default fit</p>
            <div className="mt-2 inline-flex rounded-xl border border-white/[.08] bg-[#0d0c12] p-1">
              <button className={`rounded-[9px] px-4 py-2 text-sm transition ${s.fitMode === 'width' ? 'bg-pink-400 font-semibold text-[#2a1503]' : 'text-zinc-400 hover:text-white'}`} onClick={() => patch({ fitMode: 'width' })}>Fit width</button>
              <button className={`rounded-[9px] px-4 py-2 text-sm transition ${s.fitMode === 'screen' ? 'bg-pink-400 font-semibold text-[#2a1503]' : 'text-zinc-400 hover:text-white'}`} onClick={() => patch({ fitMode: 'screen' })}>Fit screen</button>
            </div>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <p className="pixel-kicker text-[9px] text-pink-400">Appearance</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">Theme</h2>
          <p className="mt-1 text-sm text-zinc-500">Calico dark (black & orange) or day white (white & orange). Syncs to your account.</p>
          <div className="mt-4 inline-flex rounded-xl border border-white/[.08] bg-[#0d0c12] p-1" role="radiogroup" aria-label="Color theme">
            <button role="radio" aria-checked={s.theme === 'dark'} className={`rounded-[9px] px-4 py-2 text-sm transition ${s.theme === 'dark' ? 'bg-pink-400 font-semibold text-[#2a1503]' : 'text-zinc-400 hover:text-white'}`} onClick={() => patch({ theme: 'dark' })}>Calico dark</button>
            <button role="radio" aria-checked={s.theme === 'light'} className={`rounded-[9px] px-4 py-2 text-sm transition ${s.theme === 'light' ? 'bg-pink-400 font-semibold text-[#2a1503]' : 'text-zinc-400 hover:text-white'}`} onClick={() => patch({ theme: 'light' })}>Day white</button>
          </div>
        </section>

        <section className="rounded-2xl border border-pink-300/15 bg-pink-300/[.045] p-5 sm:p-6">
          <div className="grid size-10 place-items-center rounded-xl bg-pink-400/10 text-pink-300">PWA</div>
          <h2 className="mt-4 font-semibold text-zinc-100">Free install for iPhone & iPad</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Install Pachimanga from Safari using Add to Home Screen. Your account is still required when the installed PWA opens.</p>
          <Link href="/install" className="button-primary mt-5 inline-flex px-4 py-2.5 text-sm">Installation guide</Link>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="surface-card p-5 sm:p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-sky-400/10 text-sky-300">↻</div>
            <h2 className="mt-4 font-semibold text-zinc-100">Account</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Your library, imports, reader preferences and reading progress belong to your signed-in account.</p>
            <Link href="/auth" className="button-primary mt-5 inline-flex px-4 py-2.5 text-sm">Manage account</Link>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">⇩</div>
            <h2 className="mt-4 font-semibold text-zinc-100">Import library</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Bring over screenshots or backups from Tachiyomi, Mihon, and Tachimanga into your private library.</p>
            <Link href="/import" className="button-secondary mt-5 inline-flex px-4 py-2.5 text-sm">Open importer</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
