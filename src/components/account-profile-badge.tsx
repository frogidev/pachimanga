'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AccountProfileSummary = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

function safeHttpsAvatar(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function initials(displayName: string, email: string) {
  const source = displayName.trim() || email.split('@')[0] || 'P';
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}` : source.slice(0, 2)).toUpperCase();
}

export function ProfileAvatar({
  displayName,
  email,
  avatarUrl,
  className = 'size-10',
}: {
  displayName: string;
  email: string;
  avatarUrl: string;
  className?: string;
}) {
  const safeAvatar = safeHttpsAvatar(avatarUrl);
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/[.10] bg-gradient-to-br from-pink-300/25 to-orange-300/20 font-mono text-[11px] font-bold text-zinc-200 shadow-[0_4px_16px_rgba(0,0,0,.14)] ${className}`}
      style={safeAvatar ? {
        backgroundImage: `url(${JSON.stringify(safeAvatar)})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      } : undefined}
    >
      {!safeAvatar ? initials(displayName, email) : null}
    </span>
  );
}

export function AccountProfileBadge({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<AccountProfileSummary | null>(null);

  const refresh = useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user }, error } = await sb.auth.getUser();
      if (error || !user) {
        setProfile(null);
        return;
      }

      const fallbackDisplayName = typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : '';
      const fallbackAvatarUrl = typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : '';

      const profileResult = await sb
        .from('profiles')
        .select('display_name,avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setProfile({
        email: user.email || '',
        displayName: profileResult.error
          ? fallbackDisplayName
          : profileResult.data?.display_name || fallbackDisplayName,
        avatarUrl: profileResult.error
          ? fallbackAvatarUrl
          : profileResult.data?.avatar_url || fallbackAvatarUrl,
      });
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onProfileChange = () => void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('pachimanga:profile-change', onProfileChange);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('pachimanga:profile-change', onProfileChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const displayName = profile?.displayName.trim() || profile?.email.split('@')[0] || 'Account';
  const email = profile?.email || '';
  const avatarUrl = profile?.avatarUrl || '';

  if (compact) {
    return (
      <Link
        href="/settings#account"
        aria-label={`Open account settings for ${displayName}`}
        title={displayName}
        className="grid size-10 place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70"
      >
        <ProfileAvatar displayName={displayName} email={email} avatarUrl={avatarUrl} className="size-8" />
      </Link>
    );
  }

  return (
    <Link
      href="/settings#account"
      className="group flex min-h-12 items-center gap-3 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70"
      aria-label={`Open account settings for ${displayName}`}
    >
      <ProfileAvatar displayName={displayName} email={email} avatarUrl={avatarUrl} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-zinc-200 transition group-hover:text-white">{displayName}</span>
        <span className="mt-0.5 block truncate text-[10px] text-zinc-600">{email || 'Account profile'}</span>
      </span>
      <span aria-hidden="true" className="text-xs text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400">→</span>
    </Link>
  );
}
