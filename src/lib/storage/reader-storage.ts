import type { LibraryEntry, Manga, MangaStatus, ReaderSettings, ReadingHistoryEntry, ReadingProgress } from '@/types/models';
import { idbClear, idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/storage/idb';
import { collectPagedRows } from '@/lib/storage/paged-query';
import { clearLogicalClock, nextLogicalTimestamp, observeLogicalClock } from '@/lib/offline/logical-clock';
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
  preloadPages: 3,
  defaultPreset: 'webtoon',
  titlePresets: {},
};

const CACHE_OWNER_KEY = 'pachimanga:cache-owner';

type SettingsOutboxEntry = {
  userId: string;
  settings: ReaderSettings;
  updatedAt: string;
};

type LibraryOutboxEntry = {
  key: string;
  userId: string;
  operation: 'upsert' | 'delete';
  mangaId: string;
  sourceId: string;
  entry?: LibraryEntry;
  updatedAt: string;
};

function libraryMutationKey(sourceId: string, mangaId: string) {
  return `${sourceId}:${mangaId}`;
}

function applyPendingLibraryMutations(
  remote: LibraryEntry[],
  local: LibraryEntry[],
  mutations: LibraryOutboxEntry[],
) {
  const byId = new Map(remote.map((entry) => [entry.mangaId, entry]));
  const localById = new Map(local.map((entry) => [entry.mangaId, entry]));
  for (const mutation of sortOutboxByTime(mutations)) {
    if (mutation.operation === 'delete') {
      byId.delete(mutation.mangaId);
      continue;
    }
    const pending = mutation.entry || localById.get(mutation.mangaId);
    if (pending) byId.set(mutation.mangaId, pending);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
}

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
    if (owner) {
      localStorage.removeItem(`pachimanga:reader-settings:${owner}`);
      clearLogicalClock(owner);
    }
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

  const [local, allLibraryMutations] = await Promise.all([
    idbGetAll<LibraryEntry>('library'),
    idbGetAll<LibraryOutboxEntry>('libraryOutbox'),
  ]);
  const { owned: libraryMutations, stale: staleLibraryMutations } = splitOutboxByUser(allLibraryMutations, auth.user.id);
  await Promise.all(staleLibraryMutations.map((entry) => idbDelete('libraryOutbox', entry.key)));
  const localById = new Map(local.map((entry) => [entry.mangaId, entry]));
  let data;
  try {
    data = await collectPagedRows(async (from, to) => {
      const result = await auth.sb
        .from('library_entries')
        .select('manga_id,source_id,title,cover_url,added_at,reading_status,reading_status_manual,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
        .eq('user_id', auth.user.id)
        .order('added_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to);
      return { data: result.data, error: result.error };
    });
  } catch {
    return applyPendingLibraryMutations(local, local, libraryMutations);
  }

  const remote = data.map((row) => {
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

  const pendingUpserts = new Set(
    libraryMutations.filter((entry) => entry.operation === 'upsert').map((entry) => entry.mangaId),
  );
  const remoteIds = new Set(remote.map((entry) => entry.mangaId));
  await Promise.all([
    ...remote.map((entry) => idbPut('library', entry as unknown as Record<string, unknown>)),
    ...local
      .filter((entry) => !remoteIds.has(entry.mangaId) && !pendingUpserts.has(entry.mangaId))
      .map((entry) => idbDelete('library', entry.mangaId)),
  ]);

  return applyPendingLibraryMutations(remote, local, libraryMutations);
}

export async function flushLibraryOutbox(): Promise<{ synced: number; pending: number }> {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const allQueued = await idbGetAll<LibraryOutboxEntry>('libraryOutbox');
  const { owned: queued, stale } = splitOutboxByUser(allQueued, auth.user.id);
  await Promise.all(stale.map((entry) => idbDelete('libraryOutbox', entry.key)));

  let synced = 0;
  for (const mutation of sortOutboxByTime(queued)) {
    let error: unknown = null;
    if (mutation.operation === 'delete') {
      const result = await auth.sb
        .from('library_entries')
        .delete()
        .eq('user_id', auth.user.id)
        .eq('source_id', mutation.sourceId)
        .eq('manga_id', mutation.mangaId);
      error = result.error;
    } else {
      const entry = mutation.entry;
      if (!entry) {
        await idbDelete('libraryOutbox', mutation.key);
        continue;
      }
      const result = await auth.sb.from('library_entries').upsert({
        user_id: auth.user.id,
        manga_id: entry.mangaId,
        source_id: entry.sourceId,
        title: entry.manga?.title || entry.mangaId,
        cover_url: entry.manga?.coverUrl || null,
        publication_status: entry.manga?.status || entry.publicationStatus || 'unknown',
        added_at: entry.addedAt,
        updated_at: mutation.updatedAt,
      }, { onConflict: 'user_id,source_id,manga_id' });
      error = result.error;
    }
    if (error) break;
    await idbDelete('libraryOutbox', mutation.key);
    synced += 1;
  }

  const pending = (await idbGetAll<LibraryOutboxEntry>('libraryOutbox')).length;
  if (synced > 0) window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  return { synced, pending };
}

export async function addLibraryEntry(mangaId: string, sourceId = 'import', manga?: Manga) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const now = nextLogicalTimestamp(auth.user.id);
  const entry: LibraryEntry = {
    mangaId,
    sourceId,
    addedAt: now,
    manga,
    readingStatus: 'plan_to_read',
    readingStatusManual: false,
    publicationStatus: manga?.status || 'unknown',
  };
  const mutation: LibraryOutboxEntry = {
    key: libraryMutationKey(sourceId, mangaId),
    userId: auth.user.id,
    operation: 'upsert',
    mangaId,
    sourceId,
    entry,
    updatedAt: now,
  };

  await Promise.all([
    idbPut('library', entry as unknown as Record<string, unknown>),
    idbPut('libraryOutbox', mutation as unknown as Record<string, unknown>),
  ]);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  await flushLibraryOutbox().catch(() => {});
  return entry;
}

export async function removeLibraryEntry(mangaId: string) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = await idbGet<LibraryEntry>('library', mangaId);
  const sourceId = local?.sourceId || sourceIdFromMangaId(mangaId);
  const mutation: LibraryOutboxEntry = {
    key: libraryMutationKey(sourceId, mangaId),
    userId: auth.user.id,
    operation: 'delete',
    mangaId,
    sourceId,
    updatedAt: nextLogicalTimestamp(auth.user.id),
  };

  await Promise.all([
    idbDelete('library', mangaId),
    idbPut('libraryOutbox', mutation as unknown as Record<string, unknown>),
  ]);
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  await flushLibraryOutbox().catch(() => {});
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
  const rpcResult = await auth.sb.rpc('clear_my_library');

  // Compatibility fallback while the migration is not yet present on a target.
  if (rpcResult.error) {
    const missingRpc = rpcResult.error.code === 'PGRST202'
      || rpcResult.error.message.toLowerCase().includes('clear_my_library');
    if (!missingRpc) throw rpcResult.error;
    for (const table of ['reading_history', 'reading_progress', 'library_entries']) {
      const { error } = await auth.sb.from(table).delete().eq('user_id', auth.user.id);
      if (error) throw error;
    }
  }

  // Clear only library/progress/history state. Pending/current reader settings belong
  // to the account but are not part of the user-facing "clear library" action.
  await clearLibraryContentIdb();
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
  window.dispatchEvent(new CustomEvent('pachimanga:history-change'));
}

export async function getMangaProgress(mangaId: string): Promise<ReadingProgress[]> {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = (await idbGetAll<ReadingProgress>('progress')).filter((row) => row.mangaId === mangaId);

  let data;
  try {
    data = await collectPagedRows(async (from, to) => {
      const result = await auth.sb
        .from('reading_progress')
        .select('manga_id,chapter_id,page_index,scroll_progress,updated_at')
        .eq('user_id', auth.user.id)
        .eq('manga_id', mangaId)
        .order('chapter_id', { ascending: true })
        .range(from, to);
      return { data: result.data || [], error: result.error };
    });
  } catch {
    return local;
  }

  const byChapter = new Map(local.map((row) => [row.chapterId, row]));
  const cacheWrites: Promise<void>[] = [];
  for (const row of data) {
    observeLogicalClock(auth.user.id, row.updated_at);
    const remote: ReadingProgress = {
      mangaId: row.manga_id,
      chapterId: row.chapter_id,
      pageIndex: row.page_index,
      scrollPosition: 0,
      percentage: Number(row.scroll_progress) * 100,
      updatedAt: row.updated_at,
    };
    const newest = newestByUpdatedAt(byChapter.get(remote.chapterId), remote) || remote;
    byChapter.set(remote.chapterId, newest);
    if (newest === remote) {
      cacheWrites.push(idbPut('progress', remote as unknown as Record<string, unknown>));
    }
  }
  await Promise.all(cacheWrites);
  return [...byChapter.values()].filter((row) => row.mangaId === mangaId);
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

  observeLogicalClock(auth.user.id, data.updated_at);
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
export async function saveProgress(progress: ReadingProgress, options: { historyReadAt?: string; preserveTimestamp?: boolean } = {}) {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const updatedAt = options.preserveTimestamp
    ? progress.updatedAt
    : nextLogicalTimestamp(auth.user.id, progress.updatedAt);
  if (options.preserveTimestamp) observeLogicalClock(auth.user.id, progress.updatedAt);
  const normalizedProgress = { ...progress, updatedAt };
  const sourceId = sourceIdFromMangaId(progress.mangaId);
  const history: ReadingHistoryEntry = {
    mangaId: progress.mangaId,
    chapterId: progress.chapterId,
    percentage: progress.percentage,
    readAt: options.historyReadAt || updatedAt,
  };

  // Local-first: IDB + owner-bound outbox always land, even with no network.
  await Promise.all([
    idbPut('progress', normalizedProgress as unknown as Record<string, unknown>),
    idbPut('history', history as unknown as Record<string, unknown>),
    idbPut('outbox', {
      ...normalizedProgress,
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
  let data;
  try {
    data = await collectPagedRows(async (from, to) => {
      const result = await auth.sb
        .from('reading_history')
        .select('manga_id,chapter_id,percentage,read_at')
        .eq('user_id', auth.user.id)
        .order('read_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to);
      return { data: result.data, error: result.error };
    });
  } catch {
    return [...local].sort((a, b) => Date.parse(b.readAt) - Date.parse(a.readAt));
  }

  const history: ReadingHistoryEntry[] = data.map((row) => ({
    mangaId: row.manga_id,
    chapterId: row.chapter_id,
    percentage: Number(row.percentage),
    readAt: row.read_at,
  }));
  await idbClear('history');
  await Promise.all(history.map((entry) => idbPut('history', entry as unknown as Record<string, unknown>)));
  return history;
}

export type ReadingStats = {
  trackedChapters: number;
  completedChapters: number;
  activeTitles: number;
  averageProgress: number;
  lastUpdatedAt: string | null;
};

export async function getReadingStats(): Promise<ReadingStats> {
  const auth = await requireSignedIn();
  await bindCacheToUser(auth.user.id);
  const local = await idbGetAll<ReadingProgress>('progress');

  let rows: Array<{ manga_id: string; scroll_progress: number; completed: boolean; updated_at: string }>;
  try {
    rows = await collectPagedRows(async (from, to) => {
      const result = await auth.sb
        .from('reading_progress')
        .select('manga_id,scroll_progress,completed,updated_at')
        .eq('user_id', auth.user.id)
        .order('id', { ascending: true })
        .range(from, to);
      return { data: result.data || [], error: result.error };
    });
  } catch {
    rows = local.map((entry) => ({
      manga_id: entry.mangaId,
      scroll_progress: Math.max(0, Math.min(1, Number(entry.percentage || 0) / 100)),
      completed: Number(entry.percentage || 0) >= 99,
      updated_at: entry.updatedAt,
    }));
  }

  const activeTitles = new Set(rows.map((row) => row.manga_id)).size;
  const completedChapters = rows.filter((row) => row.completed || Number(row.scroll_progress) >= 0.99).length;
  const averageProgress = rows.length
    ? rows.reduce((sum, row) => sum + Math.max(0, Math.min(1, Number(row.scroll_progress) || 0)), 0) / rows.length * 100
    : 0;
  const lastUpdatedAt = rows.reduce<string | null>((latest, row) => {
    if (!Number.isFinite(Date.parse(row.updated_at))) return latest;
    return !latest || Date.parse(row.updated_at) > Date.parse(latest) ? row.updated_at : latest;
  }, null);

  return {
    trackedChapters: rows.length,
    completedChapters,
    activeTitles,
    averageProgress,
    lastUpdatedAt,
  };
}

function readerSettingsKey() {
  if (typeof window === 'undefined') return 'pachimanga:reader-settings:server';
  const owner = localStorage.getItem(CACHE_OWNER_KEY);
  return owner ? `pachimanga:reader-settings:${owner}` : 'pachimanga:reader-settings:unbound';
}

function normalizeReaderSettings(value: unknown): ReaderSettings | null {
  if (!value || typeof value !== 'object' || !('reader' in value)) return null;
  const reader = (value as { reader?: Partial<ReaderSettings> }).reader;
  if (!reader) return null;
  const rawTitlePresets = reader.titlePresets && typeof reader.titlePresets === 'object' ? reader.titlePresets : {};
  const titlePresets = Object.fromEntries(
    Object.entries(rawTitlePresets)
      .filter(([id, preset]) => id.length <= 160 && (preset === 'manga' || preset === 'webtoon'))
      .slice(-200),
  ) as ReaderSettings['titlePresets'];
  const preload = Number(reader.preloadPages);
  return {
    ...DEFAULT_READER_SETTINGS,
    ...reader,
    preloadPages: preload === 1 || preload === 2 || preload === 3 || preload === 4 ? preload : DEFAULT_READER_SETTINGS.preloadPages,
    defaultPreset: reader.defaultPreset === 'manga' ? 'manga' : 'webtoon',
    titlePresets,
  };
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

  observeLogicalClock(auth.user.id, data?.updated_at);
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

    observeLogicalClock(auth.user.id, data?.updated_at);
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
      updatedAt: nextLogicalTimestamp(auth.user.id),
    };
    await idbPut('settingsOutbox', entry as unknown as Record<string, unknown>);
    await flushSettingsOutbox();
  })().catch(() => {
    // Settings stay in the owner-bound outbox and local cache until reconnect.
  });
}
