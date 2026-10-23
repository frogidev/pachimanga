'use client';

import { useState } from 'react';
import { useLocale } from "@/lib/i18n";

export function AccountDataExport() {
  const { t } = useLocale();
  const [state, setState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function exportData() {
    if (state === 'exporting') return;
    setState('exporting');
    setMessage(t("export.preparing"));
    try {
      const response = await fetch('/api/account/export', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || t("export.failed"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `pachimanga-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setState('success');
      setMessage(t("export.done"));
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : t("export.failed"));
    }
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="account-export-title">
      <p className="pixel-kicker text-[9px] text-emerald-300">{t("export.kicker")}</p>
      <h2 id="account-export-title" className="mt-1 text-lg font-semibold text-zinc-100">{t("export.title")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
        {t("export.sub")}
      </p>
      <button
        type="button"
        onClick={() => void exportData()}
        disabled={state === 'exporting'}
        className="button-secondary mt-5 px-4 py-2.5 text-sm disabled:opacity-50"
      >
        {state === 'exporting' ? t("export.exporting") : t("export.title")}
      </button>
      <p className={`mt-3 min-h-5 text-xs ${state === 'error' ? 'text-amber-300/80' : 'text-zinc-500'}`} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
