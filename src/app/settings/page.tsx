'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AccountDataExport } from '@/components/account-data-export';
import { AccountSettings } from '@/components/account-settings';
import { ExtensionManager } from '@/components/extensions/ExtensionManager';
import { PageHeading } from '@/components/page-heading';
import { OfflineDownloadManager } from '@/components/offline-download-manager';
import { PwaDeviceStatus } from '@/components/pwa-device-status';
import { SegmentedControl } from '@/components/segmented-control';
import { SettingsDiagnostics } from '@/components/settings-diagnostics';
import { SignOutSettings } from '@/components/sign-out-settings';
import { SyncStatusPanel } from '@/components/sync-status';
import { ThemeQuickToggle } from '@/components/theme-quick-toggle';
import { DEFAULT_READER_SETTINGS, loadReaderSettings, saveReaderSettings } from '@/lib/storage/reader-storage';
import type { ReaderSettings } from '@/types/models';
import { READER_PRESETS } from '@/features/reader/presets';
import { useLocale, type ContentLanguage, type Locale } from '@/lib/i18n';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4" aria-label={title}>
      <h2 className="pixel-kicker mt-4 text-[10px] text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[.12em] text-zinc-600">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const { locale, setLocale, contentLanguage, setContentLanguage, t } = useLocale();

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

  const fitMode = s.fitMode === 'screen' ? 'screen' : 'width';

  return (
    <div className="app-page max-w-4xl">
      <PageHeading eyebrow={t("settings.kicker")} title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="mt-6 grid gap-4">
        <section id="account" className="scroll-mt-24">
          <AccountSettings />
        </section>

        <section className="surface-card p-5 sm:p-6" aria-labelledby="settings-reading-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="settings-reading-title" className="text-lg font-semibold text-zinc-100">{t("settings.reader.title")}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t("settings.reader.desc")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-pink-400/10 px-2.5 py-1 font-mono text-[10px] text-pink-300">{s.baseSpeedPxPerSecond}px/s</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-400">
              {t("settings.reader.preset")}
              <select className="field h-11 px-3 text-sm" value={s.defaultPreset || 'webtoon'} onChange={(event) => {
                const preset = event.target.value === 'manga' ? 'manga' : 'webtoon';
                patch({ defaultPreset: preset, ...READER_PRESETS[preset] });
              }}>
                <option value="manga">{t("settings.reader.preset.manga")}</option>
                <option value="webtoon">{t("settings.reader.preset.webtoon")}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              {t("settings.reader.preload")}
              <select className="field h-11 px-3 text-sm" value={s.preloadPages || 3} onChange={(event) => patch({ preloadPages: Number(event.target.value) as 1 | 2 | 3 | 4 })}>
                {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-5 block text-sm text-zinc-400">
            {t("settings.reader.speed")}
            <input
              className="mt-3 h-6 w-full accent-pink-400"
              type="range"
              min="30"
              max="500"
              step="10"
              value={s.baseSpeedPxPerSecond}
              onChange={(e) => patch({ baseSpeedPxPerSecond: Number(e.target.value) })}
            />
          </label>

          <div className="mt-5">
            <Field label={t("settings.reader.fit")}>
              <SegmentedControl
                label={t("settings.reader.fit")}
                value={fitMode}
                onChange={(fit) => patch({ fitMode: fit })}
                options={[
                  { value: 'width', label: t("settings.reader.fit.width") },
                  { value: 'screen', label: t("settings.reader.fit.screen") },
                ]}
              />
            </Field>
          </div>

          <label className="mt-5 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.025] px-3.5 py-3">
            <input type="checkbox" checked={Boolean(s.keepScreenAwake)} onChange={(event) => patch({ keepScreenAwake: event.target.checked })} className="mt-0.5 size-4 accent-pink-400" />
            <span>
              <span className="block text-sm font-medium text-zinc-200">{t("settings.reader.awake")}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{t("settings.reader.awake.desc")}</span>
            </span>
          </label>
        </section>

        <section className="surface-card p-5 sm:p-6" aria-labelledby="settings-language-title">
          <h2 id="settings-language-title" className="text-lg font-semibold text-zinc-100">{t("settings.language.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("settings.language.desc")}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label={t("settings.language.ui")}>
              <SegmentedControl<Locale>
                label={t("settings.language.ui")}
                value={locale}
                onChange={setLocale}
                options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]}
              />
            </Field>
            <Field label={t("settings.language.content")}>
              <SegmentedControl<ContentLanguage>
                label={t("settings.language.content")}
                value={contentLanguage}
                onChange={setContentLanguage}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                  { value: 'all', label: t("settings.language.all") },
                ]}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">{t("settings.language.content.hint")}</p>
          <div className="mt-5 md:hidden">
            <Field label={t("settings.theme")}>
              <ThemeQuickToggle />
            </Field>
            <p className="mt-2 text-xs text-zinc-500">{t("settings.theme.desc")}</p>
          </div>
        </section>

        <Group title={t("settings.group.device")}>
          <SyncStatusPanel />
          <PwaDeviceStatus />
          <OfflineDownloadManager />
        </Group>

        <Group title={t("settings.group.account")}>
          <AccountDataExport />
          <SignOutSettings />
        </Group>

        <details className="surface-card group p-5 sm:p-6">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70">
            <span>
              <span className="block text-lg font-semibold text-zinc-100">{t("settings.advanced")}</span>
              <span className="mt-1 block text-sm text-zinc-500">{t("settings.advanced.desc")}</span>
            </span>
            <span aria-hidden="true" className="text-zinc-500 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-5 grid gap-4">
            <ExtensionManager />
            <SettingsDiagnostics />
          </div>
        </details>
      </div>
    </div>
  );
}
