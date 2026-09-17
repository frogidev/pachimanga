import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 500;
const MAX_ROWS = 10_000;

type LibraryAvailabilityRow = {
  source_id: string;
  manga_id: string;
  title: string;
  added_at: string;
  publication_status: string | null;
  chapter_count: number | null;
  latest_chapter_id: string | null;
  latest_chapter_number: number | null;
  latest_chapter_published_at: string | null;
  new_chapter_count: number | null;
  last_chapter_change_at: string | null;
  last_checked_at: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function loadLibrary(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: LibraryAvailabilityRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from('library_entries')
      .select('source_id,manga_id,title,added_at,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('Could not load the live account library.');
    const page = (data || []) as LibraryAvailabilityRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error('Live account library exceeds the availability safety limit.');
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Authentication required.' }, 401);

  try {
    const rows = await loadLibrary(sb, user.id);
    return json({
      items: rows.map((row) => ({
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
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not load the live account library.' }, 500);
  }
}
