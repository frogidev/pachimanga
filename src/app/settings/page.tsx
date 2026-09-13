'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { getReaderSettings, saveReaderSettings } from '@/lib/storage/reader-storage';
import type { ReaderSettings } from '@/types/models';

export default function SettingsPage() {
  const [s, setS] = useState<ReaderSettings>(() => getReaderSettings());

  function patch(p: Partial<ReaderSettings>) {
    setS((v) => {
      const n = { ...v, ...p };
      saveReaderSettings(n);
      document.documentElement.dataset.theme = n.theme;
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <PageHeading title="Settings" subtitle="Reader defaults and account tools" />
      <div className="mt-7 space-y-4">
        <section className="rounded-3xl border border-white/8 bg-white/[.025] p-5">
          <h2 className="font-semibold">Reader</h2>
          <label className="mt-4 block text-sm text-zinc-400">
            Base auto-scroll speed · {s.baseSpeedPxPerSecond} px/s
            <input
              className="mt-2 w-full accent-pink-400"
              type="range"
              min="30"
              max="500"
              step="10"
              value={s.baseSpeedPxPerSecond}
              onChange={(e) => patch({ baseSpeedPxPerSecond: Number(e.target.value) })}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`rounded-xl px-4 py-2 text-sm ${
                s.fitMode === 'width' ? 'bg-pink-400 text-[#28101c]' : 'bg-white/5'
              }`}
              onClick={() => patch({ fitMode: 'width' })}
            >
              Fit width
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-sm ${
                s.fitMode === 'screen' ? 'bg-pink-400 text-[#28101c]' : 'bg-white/5'
              }`}
              onClick={() => patch({ fitMode: 'screen' })}
            >
              Fit screen
            </button>
          </div>
        </section>
        <section className="rounded-3xl border border-white/8 bg-white/[.025] p-5">
          <h2 className="font-semibold">Account & sync</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to sync imported library titles and reading progress across devices.
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-flex rounded-xl bg-pink-400 px-4 py-2 text-sm font-semibold text-[#28101c]"
          >
            Manage account
          </Link>
        </section>
        <section className="rounded-3xl border border-white/8 bg-white/[.025] p-5">
          <h2 className="font-semibold">Import</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Bring over screenshots or backups from Tachiyomi, Mihon, and Tachimanga.
          </p>
          <Link href="/import" className="mt-4 inline-flex rounded-xl bg-white/8 px-4 py-2 text-sm">
            Open importer
          </Link>
        </section>
      </div>
    </div>
  );
}
