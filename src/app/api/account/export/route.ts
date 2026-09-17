import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 500;

type ReaderSettingsExport = {
  autoScrollMultiplier?: number;
  baseSpeedPxPerSecond?: number;
  fitMode?: 'width' | 'screen';
  theme?: 'dark' | 'light';
  keepScreenAwake?: boolean;
};

function safeReaderSettings(value: unknown): ReaderSettingsExport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: ReaderSettingsExport = {};
  if (typeof input.autoScrollMultiplier === 'number' && Number.isFinite(input.autoScrollMultiplier)) output.autoScrollMultiplier = input.autoScrollMultiplier;
  if (typeof input.baseSpeedPxPerSecond === 'number' && Number.isFinite(input.baseSpeedPxPerSecond)) output.baseSpeedPxPerSecond = input.baseSpeedPxPerSecond;
  if (input.fitMode === 'width' || input.fitMode === 'screen') output.fitMode = input.fitMode;
  if (input.theme === 'dark' || input.theme === 'light') output.theme = input.theme;
  if (typeof input.keepScreenAwake === 'boolean') output.keepScreenAwake = input.keepScreenAwake;
  return output;
}

async function loadLibrary(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from('library_entries')
      .select('source_id,manga_id,title,cover_url,added_at,updated_at,reading_status,reading_status_manual,publication_status,chapter_count,latest_chapter_id,latest_chapter_number,latest_chapter_published_at,new_chapter_count,last_chapter_change_at,last_checked_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('Could not export library data.');
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadProgress(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from('reading_progress')
      .select('source_id,manga_id,chapter_id,page_index,scroll_progress,completed,updated_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('Could not export reading progress.');
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadHistory(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from('reading_history')
      .select('source_id,manga_id,chapter_id,percentage,read_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('Could not export reading history.');
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    const [library, progress, history, settingsResult] = await Promise.all([
      loadLibrary(sb, user.id),
      loadProgress(sb, user.id),
      loadHistory(sb, user.id),
      sb.from('user_settings').select('settings,updated_at').eq('user_id', user.id).maybeSingle(),
    ]);
    if (settingsResult.error) throw new Error('Could not export reader settings.');

    const exportedAt = new Date().toISOString();
    const body = {
      format: 'pachimanga-account-export',
      version: 1,
      exportedAt,
      library,
      progress,
      history,
      readerSettings: {
        settings: safeReaderSettings(settingsResult.data?.settings),
        updatedAt: settingsResult.data?.updated_at || null,
      },
    };

    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="pachimanga-export-${exportedAt.slice(0, 10)}.json"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not export account data.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
