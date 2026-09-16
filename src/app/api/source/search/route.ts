import { NextResponse } from 'next/server';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import {
  getWeebCentralTransport,
  weebCentralSource,
} from '@/sources/weebcentral/weebcentral-source';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  const transport = getWeebCentralTransport();
  if (!query) return NextResponse.json({ items: [], source: null, transport });

  const sourceErrors: string[] = [];
  try {
    const items = await weebCentralSource.search(query);
    if (items.length) return NextResponse.json({ items, source: 'WeebCentral', transport });
  } catch (error) {
    sourceErrors.push(error instanceof Error ? error.message : 'WeebCentral unavailable');
  }

  try {
    const items = await mangaDexSource.search(query);
    if (items.length) {
      return NextResponse.json({
        items,
        source: 'MangaDex',
        transport,
        warning: sourceErrors.length ? sourceErrors.join(' · ') : undefined,
      });
    }
  } catch (error) {
    sourceErrors.push(error instanceof Error ? error.message : 'MangaDex unavailable');
  }

  if (sourceErrors.length) {
    return NextResponse.json(
      {
        items: [],
        source: null,
        transport,
        error: sourceErrors.join(' · '),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ items: [], source: null, transport });
}
