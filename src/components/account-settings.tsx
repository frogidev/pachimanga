'use client';

import Link from 'next/link';
import { ProfileAvatar } from '@/components/account-profile-badge';
import { useEffect, useState } from 'react';
import { buildPasswordRecoveryRedirect } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from "@/lib/i18n";

type AccountProfile = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

function cleanAvatarUrl(value: string, t: (key: string) => string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:') throw new Error(t("account.avatar_https"));
  return parsed.toString();
}

export function AccountSettings() {
  const { t } = useLocale();
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
    void sb.auth.getUser().then(async ({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const fallback = {
        email: data.user.email ?? '',
        displayName: typeof data.user.user_metadata?.display_name === 'string' ? data.user.user_metadata.display_name : '',
        avatarUrl: typeof data.user.user_metadata?.avatar_url === 'string' ? data.user.user_metadata.avatar_url : '',
      };
      const profileResult = await sb
        .from('profiles')
        .select('display_name,avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile(profileResult.error ? fallback : {
        email: fallback.email,
        displayName: profileResult.data?.display_name || fallback.displayName,
        avatarUrl: profileResult.data?.avatar_url || fallback.avatarUrl,
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setProfileBusy(true);
    setProfileMessage('');
    try {
      const avatarUrl = cleanAvatarUrl(profile.avatarUrl, t);
      const sb = createClient();
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError || !user) throw userError || new Error(t("account.signin_again"));
      const displayName = profile.displayName.trim();
      const { error: profileError } = await sb.from('profiles').upsert({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // Keep Auth metadata synchronized for compatibility with older clients.
      const { error: metadataError } = await sb.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl },
      });
      setProfile((current) => current ? { ...current, displayName, avatarUrl } : current);
      window.dispatchEvent(new CustomEvent('pachimanga:profile-change'));
      setProfileMessage(metadataError ? t("account.saved_meta") : t("account.saved"));
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : t("account.err.save"));
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setSecurityMessage(t("account.pw_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage(t("account.pw_mismatch"));
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
      setSecurityMessage(t("account.pw_changed"));
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : t("account.err.pw"));
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
      setSecurityMessage(t("account.reset_sent"));
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : t("account.err.reset"));
    } finally {
      setSecurityBusy(false);
    }
  }

  if (loading) {
    return <section className="surface-card p-5 text-sm text-zinc-500 sm:p-6" aria-live="polite">{t("account.loading")}</section>;
  }

  if (!profile) {
    return (
      <section className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">{t("account.kicker")}</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t("account.signin_required")}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{t("account.signin_required_sub")}</p>
        <Link href="/auth?next=/settings" className="button-primary mt-5 inline-flex px-4 py-2.5 text-sm">{t("account.signin")}</Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pixel-kicker text-[9px] text-pink-400">{t("account.profile")}</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t("account.personalize")}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{t("account.profile_hint")}</p>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] px-3 py-2">
            <ProfileAvatar displayName={profile.displayName} email={profile.email} avatarUrl={profile.avatarUrl} className="size-11" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-200">{profile.displayName.trim() || t("account.add_name")}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-500">{profile.email}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("account.display_name")}
            <input
              className="field px-3.5 py-3 text-white"
              value={profile.displayName}
              maxLength={80}
              autoComplete="name"
              onChange={(event) => setProfile((current) => current ? { ...current, displayName: event.target.value } : current)}
              placeholder={t("account.display_name_ph")}
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("account.avatar_url")} <span className="text-xs text-zinc-600">{t("account.avatar_hint")}</span>
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
              {profileBusy ? t("account.saving") : t("account.save_profile")}
            </button>
            {profileMessage ? <p className="text-sm text-zinc-400" aria-live="polite">{profileMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <p className="pixel-kicker text-[9px] text-pink-400">{t("account.security")}</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t("account.password_recovery")}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{t("account.password_hint")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("account.new_password")}
            <input className="field px-3.5 py-3 text-white" type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t("auth.pw_ph")} />
          </label>
          <label className="grid gap-2 text-sm text-zinc-400">
            {t("account.confirm_password")}
            <input className="field px-3.5 py-3 text-white" type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t("account.repeat_ph")} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={changePassword} disabled={securityBusy || !newPassword || !confirmPassword} className="button-primary px-4 py-2.5 text-sm disabled:opacity-50">{t("account.change_password")}</button>
          <button type="button" onClick={sendResetEmail} disabled={securityBusy} className="button-secondary px-4 py-2.5 text-sm disabled:opacity-50">{t("account.send_reset")}</button>
        </div>
        {securityMessage ? <p className="mt-3 rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-zinc-400" aria-live="polite">{securityMessage}</p> : null}
      </section>
    </div>
  );
}
