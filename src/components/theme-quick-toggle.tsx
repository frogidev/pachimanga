'use client';

import { useEffect, useState } from 'react';
import { loadReaderSettings, saveReaderSettings } from '@/lib/storage/reader-storage';

type Theme = 'dark' | 'light';

export function ThemeQuickToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadReaderSettings()
      .then((settings) => {
        if (cancelled) return;
        setTheme(settings.theme);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  async function toggleTheme() {
    if (!ready) return;
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem('pachimanga-theme', nextTheme); } catch { /* optional local preference */ }

    try {
      const current = await loadReaderSettings();
      await saveReaderSettings({ ...current, theme: nextTheme });
    } catch {
      // The visual preference still applies locally when account sync is temporarily unavailable.
    }
  }

  const nextLabel = theme === 'dark' ? 'Use light theme' : 'Use dark theme';

  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      disabled={!ready}
      className="group flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3.5 text-[14px] text-zinc-400 transition-all hover:bg-white/[.045] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70 disabled:cursor-wait disabled:opacity-50"
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="grid size-7 place-items-center text-zinc-500 group-hover:text-pink-300" aria-hidden="true">
        {theme === 'dark' ? '☾' : '☀'}
      </span>
      <span>Theme</span>
      <span className="ml-auto rounded-full border border-white/[.08] bg-white/[.035] px-2 py-0.5 text-[10px] capitalize text-zinc-500">
        {theme}
      </span>
    </button>
  );
}
