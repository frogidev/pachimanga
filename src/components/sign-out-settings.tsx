'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearChapterCache } from '@/lib/offline/chapter-cache';
import { createClient } from '@/lib/supabase/client';
import { clearLocalUserCache } from '@/lib/storage/reader-storage';

export function SignOutSettings() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function logout() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      await Promise.all([clearLocalUserCache(), clearChapterCache()]);
      router.replace('/auth');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
      setBusy(false);
    }
  }

  return (
    <section className="surface-card border-red-400/10 p-5 sm:p-6">
      <p className="pixel-kicker text-[9px] text-zinc-500">Session</p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-100">Sign out</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500">Signing out clears the account-bound local caches on this device before returning to the authentication page.</p>
      <button type="button" onClick={() => void logout()} disabled={busy} className="button-secondary mt-5 px-4 py-2.5 text-sm disabled:opacity-50">
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {message ? <p className="mt-3 text-sm text-amber-200/80" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
