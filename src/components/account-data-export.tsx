'use client';

import { useState } from 'react';

export function AccountDataExport() {
  const [state, setState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function exportData() {
    if (state === 'exporting') return;
    setState('exporting');
    setMessage('Preparing your account export…');
    try {
      const response = await fetch('/api/account/export', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Export failed.');
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
      setMessage('Export downloaded. It contains only allowlisted account data and reader settings.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    }
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="account-export-title">
      <p className="pixel-kicker text-[9px] text-emerald-300">Your data</p>
      <h2 id="account-export-title" className="mt-1 text-lg font-semibold text-zinc-100">Export my data</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
        Download a JSON snapshot of your signed-in Library metadata/status, reading progress, history, and reader settings. The export excludes credentials, session tokens, relay secrets, service-role data, and provider cookies.
      </p>
      <button
        type="button"
        onClick={() => void exportData()}
        disabled={state === 'exporting'}
        className="button-secondary mt-5 px-4 py-2.5 text-sm disabled:opacity-50"
      >
        {state === 'exporting' ? 'Exporting…' : 'Export my data'}
      </button>
      <p className={`mt-3 min-h-5 text-xs ${state === 'error' ? 'text-amber-300/80' : 'text-zinc-500'}`} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
