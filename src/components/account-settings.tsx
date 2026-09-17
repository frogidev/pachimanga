'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildPasswordRecoveryRedirect } from '@/lib/auth/redirects';
import { clearChapterCache } from '@/lib/offline/chapter-cache';
import { createClient } from '@/lib/supabase/client';
import { clearLocalUserCache } from '@/lib/storage/reader-storage';

type AccountProfile = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

function cleanAvatarUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:') throw new Error('Avatar URL must use HTTPS.');
  return parsed.toString();
}

export function AccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    void sb.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        setProfile(null);
      } else {
        setProfile({
          email: data.user.email ?? '',
          displayName: typeof data.user.user_metadata?.display_name === 'string' ? data.user.user_metadata.display_name : '',
          avatarUrl: typeof data.user.user_metadata?.avatar_url === 'string' ? data.user.user_metadata.avatar_url : '',
        });
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setProfileBusy(true);
    setProfileMessage('');
    try {
      const avatarUrl = cleanAvatarUrl(profile.avatarUrl);
      const sb = createClient();
      const { data, error } = await sb.auth.updateUser({
        data: {
          display_name: profile.displayName.trim(),
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;
      setProfile((current) => current ? {
        ...current,
        displayName: typeof data.user.user_metadata?.display_name === 'string' ? data.user.user_metadata.display_name : '',
        avatarUrl: typeof data.user.user_metadata?.avatar_url === 'string' ? data.user.user_metadata.avatar_url : '',
      } : current);
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setSecurityMessage('Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage('The new passwords do not match.');
      return;
    }
    setSecurityBusy(true);
    setSecurityMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setSecurityMessage('Password changed successfully.');
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setSecurityBusy(false);
    }
  }

  async function sendResetEmail() {
    if (!profile?.email) return;
    setSecurityBusy(true);
    setSecurityMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.resetPasswordForEmail(profile.email, {
        redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
      });
      if (error) throw error;
      setSecurityMessage('Password reset email requested. Check your inbox and spam folder.');
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not request a password reset email.');
    } finally {
      setSecurityBusy(false);
    }
  }

  async function logout() {
    setSecurityBusy(true);
    setSecurityMessage('');
    try {
      const sb = createClient();
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      await Promise.all([clearLocalUserCache(), clearChapterCache()]);
      router.replace('/auth');
      router.refresh();
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not sign out.');
      setSecurityBusy(false);
    }
  }

  if (loading) {
    return <section className="surface-card p-5 text-sm text-zinc-500 sm:p-6" aria-live="polite">Loading account…</section>;
  }

  if (!profile) {
    return (
      <section className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">Account</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">Sign in required</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Your profile and security controls are available after signing in.</p>
        <Link href="/auth?next=/account" className="button-primary mt-5 inline-flex px-4 py-2.5 text-sm">Sign in</Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">Profile</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">Personalize your account</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">Profile fields are stored with your authenticated account and never include credentials or session tokens.</p>
          </div>
          <div className="rounded-full border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-xs text-zinc-400">{profile.email}</div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-zinc-400">
            Display name
            <input
              className="field px-3.5 py-3 text-white"
              value={profile.displayName}
              maxLength={80}
              autoComplete="name"
              onChange={(event) => setProfile((current) => current ? { ...current, displayName: event.target.value } : current)}
              placeholder="How Pachimanga should address you"
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            Avatar URL <span className="text-xs text-zinc-600">Optional, HTTPS only</span>
            <input
              className="field px-3.5 py-3 text-white"
              type="url"
              inputMode="url"
              value={profile.avatarUrl}
              onChange={(event) => setProfile((current) => current ? { ...current, avatarUrl: event.target.value } : current)}
              placeholder="https://example.com/avatar.png"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveProfile} disabled={profileBusy} className="button-primary px-4 py-2.5 text-sm disabled:opacity-50">
              {profileBusy ? 'Saving…' : 'Save profile'}
            </button>
            {profileMessage ? <p className="text-sm text-zinc-400" aria-live="polite">{profileMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">Security</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">Password & recovery</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">Change your password from this signed-in session or request the standard email recovery flow.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-400">
            New password
            <input className="field px-3.5 py-3 text-white" type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            Confirm new password
            <input className="field px-3.5 py-3 text-white" type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat new password" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={changePassword} disabled={securityBusy || !newPassword || !confirmPassword} className="button-primary px-4 py-2.5 text-sm disabled:opacity-50">Change password</button>
          <button type="button" onClick={sendResetEmail} disabled={securityBusy} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">Send reset email</button>
        </div>
        {securityMessage ? <p className="mt-3 rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-zinc-400" aria-live="polite">{securityMessage}</p> : null}
      </section>

      <section className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">Session</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">This device</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">Signing out clears the account-bound local caches on this device before returning to the authentication page.</p>
        <button type="button" onClick={logout} disabled={securityBusy} className="button-secondary mt-5 px-4 py-2.5 text-sm disabled:opacity-50">Sign out</button>
      </section>
    </div>
  );
}
