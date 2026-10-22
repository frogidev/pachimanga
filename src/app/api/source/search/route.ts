import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';
import { NextResponse } from 'next/server';
import type { MangaSource } from '@/sources/core/manga-source';
import type { Manga } from '@/types/models';
import {
  getWeebCentralTransport,
  weebCentralSource,
} from '@/sources/weebcentral/weebcentral-source';
import { zonaTmoSource } from '@/sources/zonatmo/zonatmo-source';

type Lang = 'en' | 'es' | 'all';

const SOURCES: Array<{ source: MangaSource; label: string; lang: 'en' | 'es' }> = [
  { source: weebCentralSource, label: 'WeebCentral', lang: 'en' },
  { source: zonaTmoSource, label: 'ZonaTMO', lang: 'es' },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';
  const requested = url.searchParams.get('lang');
  const lang: Lang = requested === 'es' || requested === 'all' ? requested : 'en';
  if (query.length > 100) return NextResponse.json({ items: [], source: null, sources: [], error: 'Search query is too long.' }, { status: 400 });
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ items: [], source: null, sources: [], error: 'Authentication required.' }, { status: 401 });
  const transport = getWeebCentralTransport();
  if (!query) return NextResponse.json({ items: [], source: null, sources: [], transport });

  const selected = SOURCES.filter((entry) => lang === 'all' || entry.lang === lang);
  const settled = await Promise.allSettled(
    selected.map(({ source }) => withProviderConcurrency(`${user.id}:${source.id}`, () => source.search(query))),
  );

  const items: Manga[] = [];
  const sources: string[] = [];
  const errors: string[] = [];
  settled.forEach((result, index) => {
    const { label } = selected[index];
    if (result.status === 'fulfilled') {
      if (result.value.length) {
        items.push(...result.value);
        sources.push(label);
      }
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : `${label} unavailable`);
    }
  });

  if (items.length) {
    return NextResponse.json({
      items,
      sources,
      source: sources.join(' + '),
      transport,
      warning: errors.length ? errors.join(' · ') : undefined,
    });
  }
  if (errors.length) {
    return NextResponse.json({ items: [], source: null, sources, transport, error: errors.join(' · ') }, { status: 502 });
  }
  return NextResponse.json({ items: [], source: null, sources, transport });
}
