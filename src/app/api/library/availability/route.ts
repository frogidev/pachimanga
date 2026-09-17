import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Authentication required.' }, 401);

  const { data, error } = await sb
    .from('library_entries')
    .select('source_id,manga_id,title,added_at,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) return json({ error: 'Could not load the live account library.' }, 500);

  return json({
    items: (data || []).map((row) => ({
      sourceId: row.source_id,
      mangaId: row.manga_id,
      title: row.title,
      addedAt: row.added_at,
      publicationStatus: row.publication_status,
      chapterCount: Number(row.chapter_count || 0),
      latestChapterId: row.latest_chapter_id || null,
      latestChapterNumber: row.latest_chapter_number == null ? null : Number(row.latest_chapter_number),
      latestChapterPublishedAt: row.latest_chapter_published_at || null,
      newChapterCount: Number(row.new_chapter_count || 0),
      lastChapterChangeAt: row.last_chapter_change_at || null,
      lastCheckedAt: row.last_checked_at || null,
    })),
  });
}
