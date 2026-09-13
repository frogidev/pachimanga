'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    void sb.auth.getUser().then(({ data }) => setSignedIn(data.user?.email || null));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(s?.user.email || null));
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const sb = createClient();
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        setMessage('Account created. Check your email if confirmation is enabled.');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed');
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
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setMessage(error ? error.message : 'Password reset email sent.');
    setBusy(false);
  }

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    setSignedIn(null);
    setMessage('Signed out on this device.');
  }

  if (signedIn) {
    return (
      <div className="rounded-3xl border border-white/8 bg-white/[.025] p-6">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="mt-1 font-semibold">{signedIn}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Library imports and reader progress will mirror to your private Supabase rows while this session is active.
        </p>
        <button onClick={logout} className="mt-5 rounded-xl bg-white/8 px-4 py-2 text-sm">
          Sign out
        </button>
        {message && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[.025] p-6">
      <div className="flex gap-2">
        <button
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === 'signup' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'bg-white/5'
          }`}
          onClick={() => setMode('signup')}
        >
          Register
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === 'login' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'bg-white/5'
          }`}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm text-zinc-400">
          Email
          <input
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-zinc-400">
          Password
          <input
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          className="rounded-xl bg-pink-400 px-4 py-2.5 font-semibold text-[#28101c] disabled:opacity-50"
          disabled={busy}
        >
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {mode === 'login' && (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-zinc-500 hover:text-pink-300"
          >
            Forgot password?
          </button>
        )}
        {message && <p className="text-sm text-zinc-400">{message}</p>}
      </form>
    </div>
  );
}
