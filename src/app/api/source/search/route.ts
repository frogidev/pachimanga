import { NextResponse } from 'next/server';
import { comickSource } from '@/sources/comick/comick-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import { weebCentralSource } from '@/sources/weebcentral/weebcentral-source';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || '';
  if (!query) return NextResponse.json({ items: [], source: null });

  const warnings: string[] = [];

  try {
    const items = await weebCentralSource.search(query);
    if (items.length) return NextResponse.json({ items, source: 'WeebCentral' });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'WeebCentral unavailable');
  }

  try {
    const items = await comickSource.search(query);
    if (items.length) {
      return NextResponse.json({
        items,
        source: 'ComicK',
        warning: warnings.join(' · ') || undefined,
      });
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'ComicK unavailable');
  }

  try {
    const items = await mangaDexSource.search(query);
    return NextResponse.json({
      items,
      source: 'MangaDex',
      warning: warnings.join(' · ') || undefined,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'MangaDex unavailable');
    return NextResponse.json(
      {
        items: [],
        source: null,
        error: warnings.filter(Boolean).join(' · '),
      },
      { status: 502 },
    );
  }
}
