import { NextResponse } from 'next/server';
import { nextLibrarySourceSnapshot } from '@/lib/library/library-state';
import { classifyProviderError, providerErrorHttpStatus, providerErrorPayload } from '@/lib/source/provider-error';
import { createClient } from '@/lib/supabase/server';
import { getSource } from '@/sources/core/registry';
import { SourceUnavailableError } from '@/sources/core/manga-source';
import type { Chapter, Manga } from '@/types/models';

const RECENT_REFRESH_DEDUPE_MS = 15_000;
const PROVIDER_REFRESH_TIMEOUT_MS = 15_000;

type ProviderSnapshot = { manga: Manga; chapters: Chapter[] };

const providerRefreshInFlight = new Map<string, Promise<ProviderSnapshot>>();

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function checkedRecently(value: string | null | undefined, now = Date.now()) {
  if (!value) return false;
  const checkedAt = Date.parse(value);
  return Number.isFinite(checkedAt) && now - checkedAt >= 0 && now - checkedAt < RECENT_REFRESH_DEDUPE_MS;
}

async function withProviderDeadline<T>(promise: Promise<T>, providerName: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new SourceUnavailableError(providerName, 'provider refresh timed out'));
        }, PROVIDER_REFRESH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadProviderSnapshot(source: NonNullable<ReturnType<typeof getSource>>, mangaId: string) {
  const key = `${source.id}:${mangaId}`;
  const existing = providerRefreshInFlight.get(key);
  if (existing) return existing;

  const pending = withProviderDeadline(
    Promise.all([
      source.getManga(mangaId),
      source.getChapters(mangaId),
    ]).then(([manga, chapters]) => ({ manga, chapters })),
    source.name,
  ).finally(() => {
    if (providerRefreshInFlight.get(key) === pending) providerRefreshInFlight.delete(key);
  });

  providerRefreshInFlight.set(key, pending);
  return pending;
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: { kind: 'upstream', title: 'Authentication required', message: 'Sign in before refreshing a library title.', retryable: false } }, 401);

  let body: { mangaId?: unknown; force?: unknown };
  try {
    body = await request.json() as { mangaId?: unknown; force?: unknown };
  } catch {
    return json({ error: { kind: 'upstream', title: 'Invalid request', message: 'Invalid request body.', retryable: false } }, 400);
  }

  const mangaId = typeof body.mangaId === 'string' ? body.mangaId.trim() : '';
  const force = body.force === true;
  if (!mangaId || mangaId.length > 160) return json({ error: { kind: 'upstream', title: 'Invalid request', message: 'Invalid mangaId.', retryable: false } }, 400);

  const { data: row, error: rowError } = await sb
    .from('library_entries')
    .select('source_id,manga_id,added_at,chapter_count,latest_chapter_id,latest_chapter_number,new_chapter_count,last_chapter_change_at,last_checked_at,publication_status')
    .eq('user_id', user.id)
    .eq('manga_id', mangaId)
    .maybeSingle();
  if (rowError) return json({ error: { kind: 'upstream', title: 'Library unavailable', message: 'Could not load the library entry.', retryable: true } }, 500);
  if (!row) return json({ error: { kind: 'missing', title: 'Library entry not found', message: 'This title is no longer in the signed-in account library.', retryable: false } }, 404);
  if (row.source_id === 'import') return json({ skipped: true, reason: 'Imported titles do not have a live provider.' });

  if (!force && checkedRecently(row.last_checked_at)) {
    return json({
      skipped: true,
      reason: 'This title was checked moments ago.',
      publicationStatus: row.publication_status,
      chapterCount: Number(row.chapter_count || 0),
      latestChapterId: row.latest_chapter_id,
      latestChapterNumber: row.latest_chapter_number,
      newChapterCount: Number(row.new_chapter_count || 0),
      lastChapterChangeAt: row.last_chapter_change_at,
      lastCheckedAt: row.last_checked_at,
    });
  }

  const source = getSource(row.source_id);
  if (!source) return json({ error: { kind: 'upstream', title: 'Unknown provider', message: 'This library entry references an unsupported provider.', retryable: false } }, 400);

  try {
    const { manga, chapters } = await loadProviderSnapshot(source, row.manga_id);
    const observedAt = new Date().toISOString();
    const snapshot = nextLibrarySourceSnapshot(
      {
        addedAt: row.added_at,
        chapterCount: row.chapter_count,
        latestChapterId: row.latest_chapter_id,
        latestChapterNumber: row.latest_chapter_number,
        newChapterCount: row.new_chapter_count,
        lastChapterChangeAt: row.last_chapter_change_at,
      },
      chapters,
      observedAt,
    );

    const { error: updateError } = await sb
      .from('library_entries')
      .update({
        title: manga.title,
        cover_url: manga.coverUrl || null,
        publication_status: manga.status,
        chapter_count: snapshot.chapterCount,
        latest_chapter_id: snapshot.latestChapterId,
        latest_chapter_number: snapshot.latestChapterNumber,
        latest_chapter_published_at: snapshot.latestChapterPublishedAt,
        new_chapter_count: snapshot.newChapterCount,
        last_chapter_change_at: snapshot.lastChapterChangeAt,
        last_checked_at: snapshot.lastCheckedAt,
        updated_at: observedAt,
      })
      .eq('user_id', user.id)
      .eq('source_id', row.source_id)
      .eq('manga_id', row.manga_id);
    if (updateError) return json({ error: { kind: 'upstream', title: 'Refresh could not be saved', message: 'Provider data loaded, but the account library update could not be saved.', retryable: true } }, 500);

    return json({
      publicationStatus: manga.status,
      ...snapshot,
    });
  } catch (error) {
    const info = classifyProviderError(error);
    return json(providerErrorPayload(error), providerErrorHttpStatus(info.kind));
  }
}
