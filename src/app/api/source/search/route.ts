import { NextResponse } from 'next/server';
import { weebCentralSource } from '@/sources/weebcentral/weebcentral-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (!query) return NextResponse.json({ items: [], source: null });

  let weebCentralError: string | undefined;
  try {
    const items = await weebCentralSource.search(query);
    if (items.length) {
      return NextResponse.json({ items, source: 'WeebCentral' });
    }
  } catch (error) {
    weebCentralError = error instanceof Error ? error.message : 'WeebCentral unavailable';
  }

  try {
    const items = await mangaDexSource.search(query);
    return NextResponse.json({
      items,
      source: 'MangaDex',
      warning: weebCentralError,
    });
  } catch (error) {
    const mangaDexError = error instanceof Error ? error.message : 'MangaDex unavailable';
    return NextResponse.json(
      {
        items: [],
        source: null,
        error: [weebCentralError, mangaDexError].filter(Boolean).join(' · '),
      },
      { status: 502 },
    );
  }
}
