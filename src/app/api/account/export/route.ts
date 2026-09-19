import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 500;

type ReaderSettingsExport = {
  autoScrollMultiplier?: number;
  baseSpeedPxPerSecond?: number;
  fitMode?: 'width' | 'screen';
  theme?: 'dark' | 'light';
  keepScreenAwake?: boolean;
  preloadPages?: 1 | 2 | 3 | 4;
  defaultPreset?: 'manga' | 'webtoon';
  titlePresets?: Record<string, 'manga' | 'webtoon'>;
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
  if ([1, 2, 3, 4].includes(Number(input.preloadPages))) output.preloadPages = Number(input.preloadPages) as 1 | 2 | 3 | 4;
  if (input.defaultPreset === 'manga' || input.defaultPreset === 'webtoon') output.defaultPreset = input.defaultPreset;
  if (input.titlePresets && typeof input.titlePresets === 'object' && !Array.isArray(input.titlePresets)) {
    output.titlePresets = Object.fromEntries(Object.entries(input.titlePresets as Record<string, unknown>).filter(([id, preset]) => id.length <= 160 && (preset === 'manga' || preset === 'webtoon')).slice(-200)) as Record<string, 'manga' | 'webtoon'>;
  }
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

function missingOptionalTable(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || Boolean(error?.message?.includes('library_collections'))
    || Boolean(error?.message?.includes('library_collection_items'));
}

async function loadCollections(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await sb
    .from('library_collections')
    .select('id,name,created_at,updated_at')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (missingOptionalTable(error)) return [];
  if (error) throw new Error('Could not export library collections.');
  return data || [];
}

async function loadCollectionItems(sb: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from('library_collection_items')
      .select('collection_id,source_id,manga_id,added_at')
      .eq('user_id', userId)
      .order('collection_id', { ascending: true })
      .order('manga_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (missingOptionalTable(error)) return [];
    if (error) throw new Error('Could not export collection memberships.');
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
    const [library, progress, history, collections, collectionItems, settingsResult] = await Promise.all([
      loadLibrary(sb, user.id),
      loadProgress(sb, user.id),
      loadHistory(sb, user.id),
      loadCollections(sb, user.id),
      loadCollectionItems(sb, user.id),
      sb.from('user_settings').select('settings,updated_at').eq('user_id', user.id).maybeSingle(),
    ]);
    if (settingsResult.error) throw new Error('Could not export reader settings.');

    const exportedAt = new Date().toISOString();
    const body = {
      format: 'pachimanga-account-export',
      version: 2,
      appVersion: '1.0.2',
      exportedAt,
      recordCounts: {
        library: library.length,
        progress: progress.length,
        history: history.length,
        collections: collections.length,
        collectionItems: collectionItems.length,
      },
      library,
      progress,
      history,
      collections,
      collectionItems,
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
