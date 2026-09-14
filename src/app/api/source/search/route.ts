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

  let weebCentralError: string | undefined;
  try {
    const items = await weebCentralSource.search(query);
    if (items.length) return NextResponse.json({ items, source: 'WeebCentral', transport });
  } catch (error) {
    weebCentralError = error instanceof Error ? error.message : 'WeebCentral unavailable';
  }

  try {
    const items = await mangaDexSource.search(query);
    return NextResponse.json({
      items,
      source: 'MangaDex',
      transport,
      warning: weebCentralError,
    });
  } catch (error) {
    const mangaDexError = error instanceof Error ? error.message : 'MangaDex unavailable';
    return NextResponse.json(
      {
        items: [],
        source: null,
        transport,
        error: [weebCentralError, mangaDexError].filter(Boolean).join(' · '),
      },
      { status: 502 },
    );
  }
}
