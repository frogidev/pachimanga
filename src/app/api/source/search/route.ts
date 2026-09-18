import { NextResponse } from 'next/server';
import { mergeProviderSearchResults } from '@/lib/source/search-dedupe';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import {
  getWeebCentralTransport,
  weebCentralSource,
} from '@/sources/weebcentral/weebcentral-source';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';
  const skipWeebCentral = url.searchParams.get('skipWeebCentral') === '1';
  const transport = getWeebCentralTransport();
  if (!query) return NextResponse.json({ items: [], source: null, sources: [], transport });

  const sourceErrors: string[] = [];
  const groups: Array<{ source: string; items: Awaited<ReturnType<typeof mangaDexSource.search>> }> = [];

  if (!skipWeebCentral) {
    try {
      const items = await weebCentralSource.search(query);
      if (items.length) groups.push({ source: 'WeebCentral', items });
    } catch (error) {
      sourceErrors.push(error instanceof Error ? error.message : 'WeebCentral unavailable');
    }
  }

  try {
    const items = await mangaDexSource.search(query);
    if (items.length) groups.push({ source: 'MangaDex', items });
  } catch (error) {
    sourceErrors.push(error instanceof Error ? error.message : 'MangaDex unavailable');
  }

  const items = mergeProviderSearchResults(groups.map((group) => group.items));
  const sources = groups.map((group) => group.source);
  if (items.length) {
    return NextResponse.json({
      items,
      sources,
      source: sources.join(' + '),
      transport,
      warning: sourceErrors.length ? sourceErrors.join(' · ') : undefined,
    });
  }

  if (sourceErrors.length) {
    return NextResponse.json(
      { items: [], source: null, sources, transport, error: sourceErrors.join(' · ') },
      { status: 502 },
    );
  }

  return NextResponse.json({ items: [], source: null, sources, transport });
}
