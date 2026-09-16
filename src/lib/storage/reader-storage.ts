import type { LibraryEntry, Manga, MangaStatus, ReaderSettings, ReadingHistoryEntry, ReadingProgress } from '@/types/models';
import { idbClear, idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/storage/idb';
import {
  ACCOUNT_BOUND_IDB_STORES,
  LIBRARY_CONTENT_IDB_STORES,
  isStrictlyNewerTimestamp,
  newestByUpdatedAt,
  sortOutboxByTime,
  splitOutboxByUser,
} from '@/lib/offline/sync';

export { sortOutboxByTime };

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  autoScrollMultiplier: 1,
  baseSpeedPxPerSecond: 120,
  fitMode: 'width',
  theme: 'dark',
};

const CACHE_OWNER_KEY = 'pachimanga:cache-owner';

type SettingsOutboxEntry = {
  userId: string;
  settings: ReaderSettings;
  updatedAt: string;
};

async function clearAccountBoundIdb() {
  await Promise.all(ACCOUNT_BOUND_IDB_STORES.map((store) => idbClear(store)));
}

async function clearLibraryContentIdb() {
  await Promise.all(LIBRARY_CONTENT_IDB_STORES.map((store) => idbClear(store)));
}

async function signedIn() {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const sb = createClient();
    // getSession is local-only (no network): offline reads/writes keep working.
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) return { sb, user: session.user };
    const { data: { user } } = await sb.auth.getUser();
    return user ? { sb, user } : null;
  } catch {
    return null;
  }
}

async function requireSignedIn() {
  const auth = await signedIn();
  if (!auth) throw new Error('Sign in to use Pachimanga.');
  return auth;
}

async function bindCacheToUser(userId: string) {
  if (typeof window === 'undefined') return;
  const current = localStorage.getItem(CACHE_OWNER_KEY);
  if (current === userId) return;

  await clearAccountBoundIdb();
  localStorage.removeItem('pachimanga:reader-settings');
  localStorage.removeItem('frogilab:reader-settings');
  localStorage.setItem(CACHE_OWNER_KEY, userId);
}

export async function bindCurrentUserCache() {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  return auth.user;
}

export async function clearLocalUserCache() {
  if (typeof window !== 'undefined') {
    const owner = localStorage.getItem(CACHE_OWNER_KEY);
    if (owner) localStorage.removeItem(`pachimanga:reader-settings:${owner}`);
    localStorage.removeItem(CACHE_OWNER_KEY);
    localStorage.removeItem('pachimanga:reader-settings');
    localStorage.removeItem('frogilab:reader-settings');
  }
  await clearAccountBoundIdb();
}

function sourceIdFromMangaId(mangaId: string) {
  if (mangaId.startsWith('wc-')) return 'weebcentral';
  if (mangaId.startsWith('ck-')) return 'comick';
  if (mangaId.startsWith('md-')) return 'mangadex';
  return 'import';
}

function normalizeMangaStatus(value: unknown): MangaStatus {
  return value === 'ongoing' || value === 'complete' || value === 'hiatus' || value === 'cancelled'
    ? value
    : 'unknown';
}

function placeholderManga(row: {
  manga_id: string;
  source_id: string;
  title: string;
  cover_url: string | null;
  publication_status?: string | null;
}): Manga {
  return {
    id: row.manga_id,
    sourceId: row.source_id,
    title: row.title,
    alternativeTitles: [],
    description: '',
    coverUrl: row.cover_url || '',
    author: '',
    artist: '',
    status: normalizeMangaStatus(row.publication_status),
    genres: [],
    sourceUrl: '',
  };
}

export async function getLibraryEntries() {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);

  const local = await idbGetAll<LibraryEntry>('library');
  const localById = new Map(local.map((entry) => [entry.mangaId, entry]));
  const { data, error } = await auth.sb
    .from('library_entries')
    .select('manga_id,source_id,title,cover_url,added_at,reading_status,reading_status_manual,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
    .eq('user_id', auth.user.id)
    .order('added_at', { ascending: false });
  if (error) {
    return [...local].sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
  }

  const remote = (data || []).map((row) => {
    const cached = localById.get(row.manga_id);
    const rowStatus = normalizeMangaStatus(row.publication_status);
    const publicationStatus = rowStatus === 'unknown' ? cached?.manga?.status || 'unknown' : rowStatus;
    const manga = cached?.manga
      ? {
          ...cached.manga,
          id: row.manga_id,
          sourceId: row.source_id,
          title: row.title,
          coverUrl: row.cover_url || cached.manga.coverUrl,
          status: publicationStatus,
        }
      : placeholderManga({ ...row, publication_status: publicationStatus });
    const entry: LibraryEntry = {
      ...cached,
      mangaId: row.manga_id,
      sourceId: row.source_id,
      addedAt: row.added_at,
      manga,
      readingStatus: row.reading_status,
      readingStatusManual: Boolean(row.reading_status_manual),
      publicationStatus,
      chapterCount: Number(row.chapter_count || 0),
      latestChapterId: row.latest_chapter_id || undefined,
      latestChapterNumber: row.latest_chapter_number ?? undefined,
      latestChapterPublishedAt: row.latest_chapter_published_at || undefined,
      newChapterCount: Number(row.new_chapter_count || 0),
      lastChapterChangeAt: row.last_chapter_change_at || undefined,
      lastCheckedAt: row.last_checked_at || undefined,
    };
    return entry;
  });

  const remoteIds = new Set(remote.map((entry) => entry.mangaId));
  await Promise.all([
    ...remote.map((entry) => idbPut('library', entry as unknown as Record<string, unknown>)),
    ...local.filter((entry) => !remoteIds.has(entry.mangaId)).map((entry) => idbDelete('library', entry.mangaId)),
  ]);

  return remote;
}

export async function addLibraryEntry(mangaId: string, sourceId = 'import', manga?: Manga) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const entry: LibraryEntry = {
    mangaId,
    sourceId,
    addedAt: new Date().toISOString(),
    manga,
    readingStatus: 'plan_to_read',
    readingStatusManual: false,
    publicationStatus: manga?.status || 'unknown',
  };

  const { error } = await auth.sb.from('library_entries').upsert({
    user_id: auth.user.id,
    manga_id: mangaId,
    source_id: sourceId,
    title: manga?.title || mangaId,
    cover_url: manga?.coverUrl || null,
    publication_status: manga?.status || 'unknown',
    added_at: entry.addedAt,
    updated_at: entry.addedAt,
  }, { onConflict: 'user_id,source_id,manga_id' });
  if (error) throw error;

  await idbPut('library', entry as unknown as Record<string, unknown>);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  return entry;
}

export async function removeLibraryEntry(mangaId: string) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const { error } = await auth.sb.from('library_entries').delete().eq('user_id', auth.user.id).eq('manga_id', mangaId);
  if (error) throw error;
  await idbDelete('library', mangaId);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
}

export async function setEntryProgress(
  mangaId: string,
  patch: { progress?: number; lastChapterRead?: number; lastPageRead?: number }
) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const entry = await idbGet<LibraryEntry>('library', mangaId);
  if (!entry) return;
  await idbPut('library', { ...entry, ...patch } as unknown as Record<string, unknown>);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
}

export async function clearAccountLibrary() {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  for (const table of ['library_entries', 'reading_progress', 'reading_history']) {
    const { error } = await auth.sb.from(table).delete().eq('user_id', auth.user.id);
    if (error) throw error;
  }
  // Clear only library/progress/history state. Pending/current reader settings belong
  // to the account but are not part of the user-facing "clear library" action.
  await clearLibraryContentIdb();
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
}

export async function getProgress(chapterId: string) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = await idbGet<ReadingProgress>('progress', chapterId);

  const { data, error } = await auth.sb
    .from('reading_progress')
    .select('manga_id,chapter_id,page_index,scroll_progress,updated_at')
    .eq('user_id', auth.user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle();
  if (error) {
    if (local) return local;
    throw error;
  }
  if (!data) return local;

  const remote: ReadingProgress = {
    mangaId: data.manga_id,
    chapterId: data.chapter_id,
    pageIndex: data.page_index,
    scrollPosition: 0,
    percentage: Number(data.scroll_progress) * 100,
    updatedAt: data.updated_at,
  };
  const progress = newestByUpdatedAt(local, remote) || remote;
  if (progress === remote) {
    await idbPut('progress', remote as unknown as Record<string, unknown>);
  }
  return progress;
}

/** Pure: order queued progress oldest-first so last-write-wins on flush (see '@/lib/offline/sync'). */
export async function saveProgress(progress: ReadingProgress) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const sourceId = sourceIdFromMangaId(progress.mangaId);
  const history: ReadingHistoryEntry = {
    mangaId: progress.mangaId,
    chapterId: progress.chapterId,
    percentage: progress.percentage,
    readAt: progress.updatedAt,
  };

  // Local-first: IDB + owner-bound outbox always land, even with no network.
  await Promise.all([
    idbPut('progress', progress as unknown as Record<string, unknown>),
    idbPut('history', history as unknown as Record<string, unknown>),
    idbPut('outbox', {
      ...progress,
      userId: auth.user.id,
      sourceId,
      historyReadAt: history.readAt,
    } as unknown as Record<string, unknown>),
  ]);
  window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
  await flushProgressOutbox().catch(() => {
    // Offline: stays queued, syncs on reconnect.
  });
}

/** Push queued progress to Supabase. Safe to call on boot and on 'online'. */
export async function flushProgressOutbox(): Promise<{ synced: number; pending: number }> {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const allQueued = sortOutboxByTime(await idbGetAll<ReadingProgress & {
    userId?: string;
    sourceId: string;
    historyReadAt: string;
  }>('outbox'));
  const { owned: queued, stale } = splitOutboxByUser(allQueued, auth.user.id);
  await Promise.all(stale.map((entry) => idbDelete('outbox', entry.chapterId)));

  let synced = 0;
  for (const entry of queued) {
    const [progressResult, historyResult] = await Promise.all([
      auth.sb.from('reading_progress').upsert({
        user_id: auth.user.id,
        source_id: entry.sourceId,
        manga_id: entry.mangaId,
        chapter_id: entry.chapterId,
        page_index: entry.pageIndex,
        scroll_progress: entry.percentage / 100,
        completed: entry.percentage >= 99,
        updated_at: entry.updatedAt,
      }, { onConflict: 'user_id,source_id,chapter_id' }),
      auth.sb.from('reading_history').upsert({
        user_id: auth.user.id,
        source_id: entry.sourceId,
        manga_id: entry.mangaId,
        chapter_id: entry.chapterId,
        percentage: entry.percentage,
        read_at: entry.historyReadAt,
      }, { onConflict: 'user_id,source_id,manga_id' }),
    ]);
    if (progressResult.error || historyResult.error) break;
    await idbDelete('outbox', entry.chapterId);
    synced += 1;
  }
  const pending = (await idbGetAll('outbox')).length;
  if (synced > 0) window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
  return { synced, pending };
}

export async function clearProgress(chapterId: string) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const { error } = await auth.sb
    .from('reading_progress')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('chapter_id', chapterId);
  if (error) throw error;
  await idbDelete('progress', chapterId);
  window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
}

export async function getHistory() {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = await idbGetAll<ReadingHistoryEntry>('history');
  const { data, error } = await auth.sb
    .from('reading_history')
    .select('manga_id,chapter_id,percentage,read_at')
    .eq('user_id', auth.user.id)
    .order('read_at', { ascending: false });
  if (error) {
    return [...local].sort((a, b) => Date.parse(b.readAt) - Date.parse(a.readAt));
  }

  const history: ReadingHistoryEntry[] = (data || []).map((row) => ({
    mangaId: row.manga_id,
    chapterId: row.chapter_id,
    percentage: Number(row.percentage),
    readAt: row.read_at,
  }));
  await idbClear('history');
  await Promise.all(history.map((entry) => idbPut('history', entry as unknown as Record<string, unknown>)));
  return history;
}

function readerSettingsKey() {
  if (typeof window === 'undefined') return 'pachimanga:reader-settings:server';
  const owner = localStorage.getItem(CACHE_OWNER_KEY);
  return owner ? `pachimanga:reader-settings:${owner}` : 'pachimanga:reader-settings:unbound';
}

function normalizeReaderSettings(value: unknown): ReaderSettings | null {
  if (!value || typeof value !== 'object' || !('reader' in value)) return null;
  const reader = (value as { reader?: Partial<ReaderSettings> }).reader;
  return reader ? { ...DEFAULT_READER_SETTINGS, ...reader } : null;
}

export function getReaderSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_READER_SETTINGS;
  try {
    const raw = localStorage.getItem(readerSettingsKey());
    return raw ? { ...DEFAULT_READER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_READER_SETTINGS;
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export async function loadReaderSettings() {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = getReaderSettings();
  const pending = await idbGet<SettingsOutboxEntry>('settingsOutbox', auth.user.id);
  const { data, error } = await auth.sb
    .from('user_settings')
    .select('settings,updated_at')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) return pending?.settings || local;

  const remote = normalizeReaderSettings(data?.settings);
  if (pending && isStrictlyNewerTimestamp(pending.updatedAt, data?.updated_at)) {
    localStorage.setItem(readerSettingsKey(), JSON.stringify(pending.settings));
    void flushSettingsOutbox().catch(() => {});
    return pending.settings;
  }

  if (pending && data?.updated_at && !isStrictlyNewerTimestamp(pending.updatedAt, data.updated_at)) {
    await idbDelete('settingsOutbox', auth.user.id);
  }
  const settings = remote || pending?.settings || local;
  localStorage.setItem(readerSettingsKey(), JSON.stringify(settings));
  return settings;
}

let settingsVersion = 0;
let cachedSettings: ReaderSettings | null = null;
let cachedSettingsVersion = -1;

export function subscribeReaderSettings(listener: () => void) {
  window.addEventListener("pachimanga:settings-change", listener);
  return () => window.removeEventListener("pachimanga:settings-change", listener);
}

export function getReaderSettingsSnapshot(): ReaderSettings {
  if (!cachedSettings || cachedSettingsVersion !== settingsVersion) {
    cachedSettings = getReaderSettings();
    cachedSettingsVersion = settingsVersion;
  }
  return cachedSettings;
}

/** Push the newest account-owned reader settings on boot/reconnect. */
export async function flushSettingsOutbox(): Promise<{ synced: number; pending: number }> {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const allQueued = await idbGetAll<SettingsOutboxEntry>('settingsOutbox');
  const { owned, stale } = splitOutboxByUser(allQueued, auth.user.id);
  await Promise.all(stale.map((entry) => idbDelete('settingsOutbox', entry.userId)));

  let synced = 0;
  for (const entry of owned) {
    const { data, error } = await auth.sb.from('user_settings').upsert({
      user_id: auth.user.id,
      settings: { reader: entry.settings },
      updated_at: entry.updatedAt,
    }, { onConflict: 'user_id' }).select('settings,updated_at').single();
    if (error) break;

    const remote = normalizeReaderSettings(data?.settings);
    if (remote) {
      localStorage.setItem(readerSettingsKey(), JSON.stringify(remote));
      settingsVersion += 1;
      window.dispatchEvent(new CustomEvent('pachimanga:settings-change'));
    }
    await idbDelete('settingsOutbox', entry.userId);
    synced += 1;
  }

  const pending = (await idbGetAll<SettingsOutboxEntry>('settingsOutbox')).length;
  return { synced, pending };
}

export function saveReaderSettings(settings: ReaderSettings) {
  localStorage.setItem(readerSettingsKey(), JSON.stringify(settings));
  settingsVersion += 1;
  window.dispatchEvent(new CustomEvent("pachimanga:settings-change"));
  void (async () => {
    const auth = await requireSignedIn();
    await bindCacheToUser(auth.user.id);
    const entry: SettingsOutboxEntry = {
      userId: auth.user.id,
      settings,
      updatedAt: new Date().toISOString(),
    };
    await idbPut('settingsOutbox', entry as unknown as Record<string, unknown>);
    await flushSettingsOutbox();
  })().catch(() => {
    // Settings stay in the owner-bound outbox and local cache until reconnect.
  });
}
