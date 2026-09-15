import type { LibraryEntry, Manga, ReaderSettings, ReadingHistoryEntry, ReadingProgress } from '@/types/models';
import { idbClear, idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/storage/idb';
import { sortOutboxByTime } from '@/lib/offline/sync';

export { sortOutboxByTime };

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  autoScrollMultiplier: 1,
  baseSpeedPxPerSecond: 120,
  fitMode: 'width',
  theme: 'dark',
};

const CACHE_OWNER_KEY = 'pachimanga:cache-owner';

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

  await Promise.all([idbClear('library'), idbClear('progress'), idbClear('history')]);
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
  await Promise.all([idbClear('library'), idbClear('progress'), idbClear('history')]);
}

function sourceIdFromMangaId(mangaId: string) {
  if (mangaId.startsWith('wc-')) return 'weebcentral';
  if (mangaId.startsWith('ck-')) return 'comick';
  if (mangaId.startsWith('md-')) return 'mangadex';
  return 'import';
}

function placeholderManga(row: { manga_id: string; source_id: string; title: string; cover_url: string | null }): Manga {
  return {
    id: row.manga_id,
    sourceId: row.source_id,
    title: row.title,
    alternativeTitles: [],
    description: '',
    coverUrl: row.cover_url || '',
    author: '',
    artist: '',
    status: 'unknown',
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
    .select('manga_id,source_id,title,cover_url,added_at')
    .eq('user_id', auth.user.id)
    .order('added_at', { ascending: false });
  if (error) throw error;

  const remote = (data || []).map((row) => {
    const cached = localById.get(row.manga_id);
    const entry: LibraryEntry = {
      mangaId: row.manga_id,
      sourceId: row.source_id,
      addedAt: row.added_at,
      manga: cached?.manga || placeholderManga(row),
      lastReadAt: cached?.lastReadAt,
      progress: cached?.progress,
      lastChapterRead: cached?.lastChapterRead,
      lastPageRead: cached?.lastPageRead,
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
  const entry: LibraryEntry = { mangaId, sourceId, addedAt: new Date().toISOString(), manga };

  const { error } = await auth.sb.from('library_entries').upsert({
    user_id: auth.user.id,
    manga_id: mangaId,
    source_id: sourceId,
    title: manga?.title || mangaId,
    cover_url: manga?.coverUrl || null,
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
  await Promise.all([idbClear('library'), idbClear('progress'), idbClear('history')]);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
}

export async function getProgress(chapterId: string) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = await idbGet<ReadingProgress>('progress', chapterId);
  if (local) return local;

  const { data, error } = await auth.sb
    .from('reading_progress')
    .select('manga_id,chapter_id,page_index,scroll_progress,updated_at')
    .eq('user_id', auth.user.id)
    .eq('chapter_id', chapterId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  const progress: ReadingProgress = {
    mangaId: data.manga_id,
    chapterId: data.chapter_id,
    pageIndex: data.page_index,
    scrollPosition: 0,
    percentage: Number(data.scroll_progress) * 100,
    updatedAt: data.updated_at,
  };
  await idbPut('progress', progress as unknown as Record<string, unknown>);
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

  // Local-first: IDB + outbox always land, even with no network.
  await Promise.all([
    idbPut('progress', progress as unknown as Record<string, unknown>),
    idbPut('history', history as unknown as Record<string, unknown>),
    idbPut('outbox', {
      ...progress,
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
  const queued = sortOutboxByTime(await idbGetAll<ReadingProgress & { sourceId: string; historyReadAt: string }>('outbox'));
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
  const { data, error } = await auth.sb
    .from('reading_history')
    .select('manga_id,chapter_id,percentage,read_at')
    .eq('user_id', auth.user.id)
    .order('read_at', { ascending: false });
  if (error) throw error;

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
  const { data, error } = await auth.sb
    .from('user_settings')
    .select('settings')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw error;

  const remote = data?.settings && typeof data.settings === 'object' && 'reader' in data.settings
    ? (data.settings as { reader?: Partial<ReaderSettings> }).reader
    : undefined;
  const settings = remote ? { ...DEFAULT_READER_SETTINGS, ...remote } : getReaderSettings();
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

export function saveReaderSettings(settings: ReaderSettings) {
  localStorage.setItem(readerSettingsKey(), JSON.stringify(settings));
  settingsVersion += 1;
  window.dispatchEvent(new CustomEvent("pachimanga:settings-change"));
  void (async () => {
    const auth = await requireSignedIn();
    await bindCacheToUser(auth.user.id);
    await auth.sb.from('user_settings').upsert({
      user_id: auth.user.id,
      settings: { reader: settings },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  })();
}
