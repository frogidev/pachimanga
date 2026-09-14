'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { bindCurrentUserCache, clearLocalUserCache } from '@/lib/storage/reader-storage';

function requestedDestination() {
  if (typeof window === 'undefined') return '/';
  const value = new URLSearchParams(window.location.search).get('next');
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function initialAuthMessage() {
  if (typeof window === 'undefined') return '';
  const error = new URLSearchParams(window.location.search).get('error');
  if (error === 'confirmation') return 'The confirmation link is invalid or expired. Request a new sign-up email or try signing in.';
  if (error === 'configuration') return 'Authentication is temporarily unavailable.';
  return '';
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(initialAuthMessage);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    void sb.auth.getUser().then(async ({ data }) => {
      setSignedIn(data.user?.email || null);
      if (data.user) await bindCurrentUserCache();
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session?.user.email || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const sb = createClient();
      if (mode === 'signup') {
        const next = requestedDestination();
        const confirmUrl = new URL('/auth/confirm', window.location.origin);
        if (next !== '/') confirmUrl.searchParams.set('next', next);
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: confirmUrl.toString() },
        });
        if (error) throw error;
        if (data.session) {
          await bindCurrentUserCache();
          router.replace(next);
          router.refresh();
          return;
        }
        setMessage('Account created. Check your email to confirm the account, then sign in.');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await bindCurrentUserCache();
        router.replace(requestedDestination());
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email) {
      setMessage('Enter your email first.');
      return;
    }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
    setMessage(error ? error.message : 'Password reset email sent.');
    setBusy(false);
  }

  async function logout() {
    setBusy(true);
    const sb = createClient();
    await sb.auth.signOut();
    await clearLocalUserCache();
    setSignedIn(null);
    setMessage('Signed out on this device.');
    router.replace('/auth');
    router.refresh();
    setBusy(false);
  }

  if (signedIn) {
    return (
      <div className="surface-card p-6">
        <div className="grid size-11 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">✓</div>
        <p className="mt-4 text-xs uppercase tracking-[.12em] text-zinc-600">Signed in as</p>
        <p className="mt-1 break-all font-semibold text-zinc-100">{signedIn}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">This account owns the library, imports, reader settings and reading progress on Pachimanga.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="button-primary px-4 py-2.5 text-sm">Open library</Link>
          <button onClick={logout} disabled={busy} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">Sign out</button>
        </div>
        {message ? <p className="mt-3 text-sm text-zinc-400">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="surface-card p-5 sm:p-6">
      <div className="grid grid-cols-2 rounded-xl border border-white/[.07] bg-[#0d0c12] p-1">
        <button type="button" className={`rounded-[9px] px-4 py-2.5 text-sm transition ${mode === 'login' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'text-zinc-400 hover:text-white'}`} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" className={`rounded-[9px] px-4 py-2.5 text-sm transition ${mode === 'signup' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'text-zinc-400 hover:text-white'}`} onClick={() => setMode('signup')}>Register</button>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm text-zinc-400">
          Email
          <input className="field px-3.5 py-3 text-white" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-400">
          Password
          <input className="field px-3.5 py-3 text-white" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        <button className="button-primary mt-1 px-4 py-3 text-sm disabled:opacity-50" disabled={busy}>{busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        {mode === 'login' ? <button type="button" onClick={reset} className="text-sm text-zinc-500 transition hover:text-pink-300">Forgot password?</button> : null}
        {message ? <p className="rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-zinc-400">{message}</p> : null}
      </form>
    </div>
  );
}
