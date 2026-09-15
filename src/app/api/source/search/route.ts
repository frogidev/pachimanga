import { NextResponse } from 'next/server';
import { comickSource } from '@/sources/comick/comick-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import {
  getWeebCentralTransport,
  weebCentralSource,
} from '@/sources/weebcentral/weebcentral-source';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  const transport = getWeebCentralTransport();
  if (!query) return NextResponse.json({ items: [], source: null, transport });

  let weebCentralError: string | undefined;
  try {
    const items = await weebCentralSource.search(query);
    if (items.length) return NextResponse.json({ items, source: 'WeebCentral', transport });
  } catch (error) {
    weebCentralError = error instanceof Error ? error.message : 'WeebCentral unavailable';
  }

  try {
    const items = await mangaDexSource.search(query);
    if (items.length) {
      return NextResponse.json({
        items,
        source: 'MangaDex',
        transport,
        warning: weebCentralError,
      });
    }
  } catch (error) {
    weebCentralError = [weebCentralError, error instanceof Error ? error.message : 'MangaDex unavailable']
      .filter(Boolean)
      .join(' · ');
  }

  try {
    const items = await comickSource.search(query);
    return NextResponse.json({
      items,
      source: 'ComicK',
      transport,
      warning: weebCentralError,
    });
  } catch (error) {
    const comickError = error instanceof Error ? error.message : 'ComicK unavailable';
    return NextResponse.json(
      {
        items: [],
        source: null,
        transport,
        error: [weebCentralError, comickError].filter(Boolean).join(' · '),
      },
      { status: 502 },
    );
  }
}
