import { NextResponse } from 'next/server';
import { nextLibrarySourceSnapshot } from '@/lib/library/library-state';
import { classifyProviderError, providerErrorHttpStatus, providerErrorPayload } from '@/lib/source/provider-error';
import { createClient } from '@/lib/supabase/server';
import { getSource } from '@/sources/core/registry';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: { kind: 'upstream', title: 'Authentication required', message: 'Sign in before refreshing a library title.', retryable: false } }, 401);

  let body: { mangaId?: unknown };
  try {
    body = await request.json() as { mangaId?: unknown };
  } catch {
    return json({ error: { kind: 'upstream', title: 'Invalid request', message: 'Invalid request body.', retryable: false } }, 400);
  }

  const mangaId = typeof body.mangaId === 'string' ? body.mangaId.trim() : '';
  if (!mangaId || mangaId.length > 160) return json({ error: { kind: 'upstream', title: 'Invalid request', message: 'Invalid mangaId.', retryable: false } }, 400);

  const { data: row, error: rowError } = await sb
    .from('library_entries')
    .select('source_id,manga_id,added_at,chapter_count,latest_chapter_id,latest_chapter_number,new_chapter_count,last_chapter_change_at')
    .eq('user_id', user.id)
    .eq('manga_id', mangaId)
    .maybeSingle();
  if (rowError) return json({ error: { kind: 'upstream', title: 'Library unavailable', message: 'Could not load the library entry.', retryable: true } }, 500);
  if (!row) return json({ error: { kind: 'missing', title: 'Library entry not found', message: 'This title is no longer in the signed-in account library.', retryable: false } }, 404);
  if (row.source_id === 'import') return json({ skipped: true, reason: 'Imported titles do not have a live provider.' });

  const source = getSource(row.source_id);
  if (!source) return json({ error: { kind: 'upstream', title: 'Unknown provider', message: 'This library entry references an unsupported provider.', retryable: false } }, 400);

  try {
    const [manga, chapters] = await Promise.all([
      source.getManga(row.manga_id),
      source.getChapters(row.manga_id),
    ]);
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
