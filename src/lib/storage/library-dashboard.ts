'use client';

import {
  automaticLibraryReadingStatus,
  normalizeLibraryReadingStatus,
  summarizeLibraryProgress,
  type LibraryReadingStatus,
} from '@/lib/library/library-state';
import { createClient } from '@/lib/supabase/client';
import { idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/storage/idb';
import { bindCurrentUserCache } from '@/lib/storage/reader-storage';
import type { LibraryEntry, Manga, MangaStatus, ReadingProgress } from '@/types/models';

type LibraryRow = {
  manga_id: string;
  source_id: string;
  title: string;
  cover_url: string | null;
  added_at: string;
  reading_status: string;
  reading_status_manual: boolean;
  publication_status: string;
  chapter_count: number;
  latest_chapter_id: string | null;
  latest_chapter_number: number | null;
  latest_chapter_published_at: string | null;
  new_chapter_count: number;
  last_chapter_change_at: string | null;
  last_checked_at: string | null;
};

type ProgressRow = {
  manga_id: string;
  chapter_id: string;
  page_index: number;
  scroll_progress: number;
  updated_at: string;
};

function mangaStatus(value: unknown): MangaStatus {
  return value === 'ongoing' || value === 'complete' || value === 'hiatus' || value === 'cancelled'
    ? value
    : 'unknown';
}

function placeholderManga(row: LibraryRow, status: MangaStatus): Manga {
  return {
    id: row.manga_id,
    sourceId: row.source_id,
    title: row.title,
    alternativeTitles: [],
    description: '',
    coverUrl: row.cover_url || '',
    author: '',
    artist: '',
    status,
    genres: [],
    sourceUrl: '',
  };
}

function newerProgress(a: ReadingProgress | undefined, b: ReadingProgress) {
  if (!a) return b;
  const aTime = Date.parse(a.updatedAt);
  const bTime = Date.parse(b.updatedAt);
  if (!Number.isFinite(aTime)) return b;
  if (!Number.isFinite(bTime)) return a;
  return bTime >= aTime ? b : a;
}

function rowsByManga(rows: ReadingProgress[]) {
  const grouped = new Map<string, ReadingProgress[]>();
  for (const row of rows) {
    const list = grouped.get(row.mangaId) || [];
    list.push(row);
    grouped.set(row.mangaId, list);
  }
  return grouped;
}

function withDerivedLocalState(entries: LibraryEntry[], progressRows: ReadingProgress[]) {
  const progress = rowsByManga(progressRows);
  return entries.map((entry) => {
    const summary = summarizeLibraryProgress(entry.chapterCount || 0, progress.get(entry.mangaId) || [], entry.progress || 0);
    const automatic = automaticLibraryReadingStatus(summary);
    const readingStatus = entry.readingStatusManual
      ? normalizeLibraryReadingStatus(entry.readingStatus)
      : automatic;
    return {
      ...entry,
      progress: summary.percentage,
      readingStatus,
      publicationStatus: entry.publicationStatus || entry.manga?.status || 'unknown',
    };
  });
}

export async function getLibraryDashboardEntries(): Promise<LibraryEntry[]> {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const [localEntries, localProgress, libraryResult, progressResult] = await Promise.all([
    idbGetAll<LibraryEntry>('library'),
    idbGetAll<ReadingProgress>('progress'),
    sb
      .from('library_entries')
      .select('manga_id,source_id,title,cover_url,added_at,reading_status,reading_status_manual,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false }),
    sb
      .from('reading_progress')
      .select('manga_id,chapter_id,page_index,scroll_progress,updated_at')
      .eq('user_id', user.id),
  ]);

  if (libraryResult.error) {
    return withDerivedLocalState(localEntries, localProgress)
      .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
  }

  const newestByChapter = new Map<string, ReadingProgress>();
  const progressCacheWrites: Promise<void>[] = [];
  for (const row of localProgress) newestByChapter.set(row.chapterId, row);
  if (!progressResult.error) {
    for (const row of (progressResult.data || []) as ProgressRow[]) {
      const remote: ReadingProgress = {
        mangaId: row.manga_id,
        chapterId: row.chapter_id,
        pageIndex: row.page_index,
        scrollPosition: 0,
        percentage: Number(row.scroll_progress) * 100,
        updatedAt: row.updated_at,
      };
      const newest = newerProgress(newestByChapter.get(remote.chapterId), remote);
      newestByChapter.set(remote.chapterId, newest);
      if (newest === remote) {
        progressCacheWrites.push(idbPut('progress', remote as unknown as Record<string, unknown>));
      }
    }
  }

  const progress = rowsByManga([...newestByChapter.values()]);
  const localById = new Map(localEntries.map((entry) => [entry.mangaId, entry]));
  const statusWrites: PromiseLike<unknown>[] = [];
  const libraryCacheWrites: Promise<void>[] = [];
  const remoteEntries: LibraryEntry[] = [];

  for (const row of (libraryResult.data || []) as LibraryRow[]) {
    const cached = localById.get(row.manga_id);
    const rowPublicationStatus = mangaStatus(row.publication_status);
    const effectivePublicationStatus = rowPublicationStatus === 'unknown'
      ? cached?.manga?.status || 'unknown'
      : rowPublicationStatus;
    const summary = summarizeLibraryProgress(
      Number(row.chapter_count || 0),
      progress.get(row.manga_id) || [],
      cached?.progress || 0,
    );
    const storedStatus = normalizeLibraryReadingStatus(row.reading_status);
    const automaticStatus = automaticLibraryReadingStatus(summary);
    const readingStatus = row.reading_status_manual ? storedStatus : automaticStatus;
    const manga = cached?.manga
      ? {
          ...cached.manga,
          id: row.manga_id,
          sourceId: row.source_id,
          title: row.title,
          coverUrl: row.cover_url || cached.manga.coverUrl,
          status: effectivePublicationStatus,
        }
      : placeholderManga(row, effectivePublicationStatus);

    const entry: LibraryEntry = {
      mangaId: row.manga_id,
      sourceId: row.source_id,
      addedAt: row.added_at,
      manga,
      lastReadAt: cached?.lastReadAt,
      progress: summary.percentage,
      lastChapterRead: cached?.lastChapterRead,
      lastPageRead: cached?.lastPageRead,
      readingStatus,
      readingStatusManual: Boolean(row.reading_status_manual),
      publicationStatus: effectivePublicationStatus,
      chapterCount: Number(row.chapter_count || 0),
      latestChapterId: row.latest_chapter_id || undefined,
      latestChapterNumber: row.latest_chapter_number ?? undefined,
      latestChapterPublishedAt: row.latest_chapter_published_at || undefined,
      newChapterCount: Number(row.new_chapter_count || 0),
      lastChapterChangeAt: row.last_chapter_change_at || undefined,
      lastCheckedAt: row.last_checked_at || undefined,
    };
    remoteEntries.push(entry);
    libraryCacheWrites.push(idbPut('library', entry as unknown as Record<string, unknown>));

    if (!row.reading_status_manual && storedStatus !== automaticStatus) {
      statusWrites.push(
        sb
          .from('library_entries')
          .update({ reading_status: automaticStatus, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('source_id', row.source_id)
          .eq('manga_id', row.manga_id),
      );
    }
  }

  const remoteIds = new Set(remoteEntries.map((entry) => entry.mangaId));
  const staleLibraryDeletes = localEntries
    .filter((entry) => !remoteIds.has(entry.mangaId))
    .map((entry) => idbDelete('library', entry.mangaId));
  await Promise.all([...progressCacheWrites, ...libraryCacheWrites, ...staleLibraryDeletes]);
  if (statusWrites.length) await Promise.allSettled(statusWrites);
  return remoteEntries;
}

export async function setLibraryReadingStatus(
  mangaId: string,
  sourceId: string,
  status: LibraryReadingStatus | null,
) {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const now = new Date().toISOString();
  const update = status
    ? { reading_status: status, reading_status_manual: true, updated_at: now }
    : { reading_status_manual: false, updated_at: now };
  const { error } = await sb
    .from('library_entries')
    .update(update)
    .eq('user_id', user.id)
    .eq('source_id', sourceId)
    .eq('manga_id', mangaId);
  if (error) throw error;

  const local = await idbGet<LibraryEntry>('library', mangaId);
  if (local) {
    await idbPut('library', {
      ...local,
      ...(status ? { readingStatus: status } : {}),
      readingStatusManual: Boolean(status),
    } as unknown as Record<string, unknown>);
  }
  window.dispatchEvent(new CustomEvent('pachimanga:library-change'));
}

export async function acknowledgeLibraryUpdates(mangaId: string, sourceId: string) {
  const user = await bindCurrentUserCache();
  const sb = createClient();
  const { error } = await sb
    .from('library_entries')
    .update({ new_chapter_count: 0, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('source_id', sourceId)
    .eq('manga_id', mangaId);
  if (error) throw error;

  const local = await idbGet<LibraryEntry>('library', mangaId);
  if (local) {
    await idbPut('library', { ...local, newChapterCount: 0 } as unknown as Record<string, unknown>);
  }
}
