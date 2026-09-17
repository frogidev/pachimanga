'use client';

import { useEffect, useState } from 'react';
import { AccountDataExport } from '@/components/account-data-export';
import { AccountSettings } from '@/components/account-settings';
import { PageHeading } from '@/components/page-heading';
import { PwaDeviceStatus } from '@/components/pwa-device-status';
import { SettingsDiagnostics } from '@/components/settings-diagnostics';
import { SignOutSettings } from '@/components/sign-out-settings';
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
      return next;
    });
  }

  return (
    <div className="app-page max-w-4xl">
      <PageHeading eyebrow="Preferences" title="Settings" subtitle="Manage your account, reading experience, sync and device behavior in one place." />
      <div className="mt-6 grid gap-4">
        <section id="account" className="scroll-mt-24">
          <AccountSettings />
        </section>

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

          <label className="mt-6 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-3.5 py-3">
            <input type="checkbox" checked={Boolean(s.keepScreenAwake)} onChange={(event) => patch({ keepScreenAwake: event.target.checked })} className="mt-0.5 size-4 accent-pink-400" />
            <span>
              <span className="block text-sm font-medium text-zinc-200">Keep screen awake while reading</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">Uses the browser Screen Wake Lock API when supported and releases it when the reader closes or the app is backgrounded.</span>
            </span>
          </label>
        </section>

        <SyncStatusPanel />
        <PwaDeviceStatus />
        <AccountDataExport />
        <SettingsDiagnostics />
        <SignOutSettings />
      </div>
    </div>
  );
}
