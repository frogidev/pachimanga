'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { buildPasswordRecoveryRedirect, isPasswordRecoveryRequest, safeLocalPath } from '@/lib/auth/redirects';
import { clearChapterCache } from '@/lib/offline/chapter-cache';
import { createClient } from '@/lib/supabase/client';
import { bindCurrentUserCache, clearLocalUserCache } from '@/lib/storage/reader-storage';
import { useLocale } from "@/lib/i18n";

function requestedDestination() {
  if (typeof window === 'undefined') return '/';
  return safeLocalPath(new URLSearchParams(window.location.search).get('next'));
}

function initialAuthMessageKey() {
  if (typeof window === 'undefined') return '';
  const error = new URLSearchParams(window.location.search).get('error');
  if (error === 'confirmation') return 'auth.err.confirmation';
  if (error === 'configuration') return 'auth.err.configuration';
  return '';
}

function initialRecoveryRequest() {
  return typeof window !== 'undefined' && isPasswordRecoveryRequest(window.location.search);
}

function subscribeUrlState() {
  return () => {};
}

function confirmationRedirect() {
  const next = requestedDestination();
  const confirmUrl = new URL('/auth/confirm', window.location.origin);
  if (next !== '/') confirmUrl.searchParams.set('next', next);
  return confirmUrl.toString();
}

export function AuthForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const urlMessageKey = useSyncExternalStore(subscribeUrlState, initialAuthMessageKey, () => '');
  const recoveryRequested = useSyncExternalStore(subscribeUrlState, initialRecoveryRequest, () => false);
  const [recoveryEvent, setRecoveryEvent] = useState(false);
  const recoveryMode = recoveryRequested || recoveryEvent;
  const [override, setOverride] = useState<string | null>(null);
  const message = override ?? (urlMessageKey ? t(urlMessageKey) : '');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;
    try {
      const sb = createClient();
      void sb.auth.getUser().then(async ({ data }) => {
        if (cancelled) return;
        setSignedIn(data.user?.email || null);
        if (data.user) await bindCurrentUserCache();
        else await clearChapterCache();
      });
      const listener = sb.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        setSignedIn(session?.user.email || null);
        if (event === 'PASSWORD_RECOVERY') setRecoveryEvent(true);
        if (event === 'SIGNED_OUT') void clearChapterCache();
      });
      subscription = listener.data.subscription;
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setOverride('Authentication is temporarily unavailable.');
      });
    }
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setOverride('');
    try {
      const sb = createClient();
      if (mode === 'signup') {
        const next = requestedDestination();
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: confirmationRedirect() },
        });
        if (error) throw error;
        if (data.session) {
          await bindCurrentUserCache();
          router.replace(next);
          router.refresh();
          return;
        }
        setOverride(t("auth.registered"));
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await bindCurrentUserCache();
        router.replace(requestedDestination());
        router.refresh();
      }
    } catch (error) {
      setOverride(error instanceof Error ? error.message : t("auth.err.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!email) {
      setOverride(t("auth.enter_registered_email"));
      return;
    }
    setBusy(true);
    setOverride('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: confirmationRedirect() },
      });
      if (error) throw error;
      setOverride(t("auth.confirm_sent"));
    } catch (error) {
      setOverride(error instanceof Error ? error.message : t("auth.err.resend"));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email) {
      setOverride(t("auth.enter_email"));
      return;
    }
    setBusy(true);
    setOverride('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
      });
      setOverride(error ? error.message : t("auth.reset_sent"));
    } catch (error) {
      setOverride(error instanceof Error ? error.message : t("auth.err.reset"));
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setOverride('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await bindCurrentUserCache();
      setRecoveryEvent(false);
      router.replace('/account');
      router.refresh();
    } catch (error) {
      setOverride(error instanceof Error ? error.message : t("auth.err.update"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setOverride('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      await Promise.all([clearLocalUserCache(), clearChapterCache()]);
      setSignedIn(null);
      setOverride(t("auth.signed_out"));
      router.replace('/auth');
      router.refresh();
    } catch (error) {
      setOverride(error instanceof Error ? error.message : t("auth.err.signout"));
    } finally {
      setBusy(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">{t("auth.recovery_kicker")}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{t("auth.choose_password")}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{t("auth.set_password")}</p>
        <form onSubmit={updatePassword} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("account.new_password")}
            <input
              className="field px-3.5 py-3 text-white"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t("auth.pw_ph")}
              autoComplete="new-password"
            />
          </label>
          <button className="button-primary mt-1 px-4 py-3 text-sm disabled:opacity-50" disabled={busy}>
            {busy ? t("auth.updating") : t("auth.update_password")}
          </button>
          {message ? <p className="rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-zinc-400" aria-live="polite">{message}</p> : null}
        </form>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="surface-card p-6">
        <div className="grid size-11 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">✓</div>
        <p className="mt-4 text-xs uppercase tracking-[.12em] text-zinc-600">{t("auth.signed_in_as")}</p>
        <p className="mt-1 break-all font-semibold text-zinc-100">{signedIn}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{t("auth.owns")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/account" className="button-primary px-4 py-2.5 text-sm">{t("auth.manage")}</Link>
          <Link href="/" className="button-secondary px-4 py-2.5 text-sm">{t("auth.open_library")}</Link>
          <button onClick={logout} disabled={busy} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">{t("auth.signout")}</button>
        </div>
        {message ? <p className="mt-3 text-sm text-zinc-400" aria-live="polite">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="surface-card p-5 sm:p-6">
      <div className="grid grid-cols-2 rounded-xl border border-white/[.07] bg-[#0d0c12] p-1">
        <button type="button" className={`rounded-[9px] px-4 py-2.5 text-sm transition ${mode === 'login' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'text-zinc-400 hover:text-white'}`} onClick={() => { setMode('login'); setOverride(''); }}>{t("account.signin")}</button>
        <button type="button" className={`rounded-[9px] px-4 py-2.5 text-sm transition ${mode === 'signup' ? 'bg-pink-400 font-semibold text-[#28101c]' : 'text-zinc-400 hover:text-white'}`} onClick={() => { setMode('signup'); setOverride(''); }}>{t("auth.register")}</button>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm text-zinc-400">
          {t("auth.email")}
          <input className="field px-3.5 py-3 text-white" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-400">
          {t("auth.password")}
          <input className="field px-3.5 py-3 text-white" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("auth.pw_ph")} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        <button className="button-primary mt-1 px-4 py-3 text-sm disabled:opacity-50" disabled={busy}>{busy ? t("auth.working") : mode === 'signup' ? t("auth.create") : t("account.signin")}</button>

        {mode === 'login' ? (
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <p className="text-xs font-medium uppercase tracking-[.1em] text-zinc-600">{t("auth.help")}</p>
            <button type="button" onClick={reset} disabled={busy} className="mt-2 text-sm font-medium text-pink-300 transition hover:text-pink-200 disabled:opacity-50">{t("auth.forgot")}</button>
          </div>
        ) : null}

        {mode === 'signup' || urlMessageKey === 'auth.err.confirmation' ? (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3">
            <p className="text-xs font-medium uppercase tracking-[.1em] text-amber-300">{t("auth.confirmation_kicker")}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{t("auth.confirmation_hint")}</p>
            <button type="button" onClick={resendConfirmation} disabled={busy} className="button-secondary mt-3 px-3 py-2 text-sm disabled:opacity-50">{t("auth.resend")}</button>
          </div>
        ) : null}

        {message ? <p className="rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-zinc-400" aria-live="polite">{message}</p> : null}
      </form>
    </div>
  );
}
