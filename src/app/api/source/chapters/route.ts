import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';
import { classifyProviderError, providerErrorHttpStatus, providerErrorPayload } from '@/lib/source/provider-error';
import { getSource } from '@/sources/core/registry';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get('source') || '';
  const mangaId = params.get('mangaId') || '';
  if (!mangaId || mangaId.length > 160) {
    return NextResponse.json({ chapters: [], error: { kind: 'upstream', title: 'Invalid request', message: 'Missing or invalid mangaId.', retryable: false } }, { status: 400 });
  }
  const provider = source === 'weebcentral' || source === 'zonatmo' ? getSource(source) : undefined;
  if (!provider) {
    return NextResponse.json({ chapters: [], error: { kind: 'upstream', title: 'Unknown provider', message: 'Unknown source.', retryable: false } }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ chapters: [], error: { kind: 'upstream', title: 'Authentication required', message: 'Sign in before loading chapters.', retryable: false } }, { status: 401 });
  }

  try {
    const chapters = await withProviderConcurrency(`${user.id}:${provider.id}`, () => provider.getChapters(mangaId));
    return NextResponse.json({
      chapters: chapters.map((chapter) => ({ id: chapter.id, mangaId: chapter.mangaId, sourceId: chapter.sourceId, chapterNumber: chapter.chapterNumber, title: chapter.title, sourceUrl: chapter.sourceUrl })),
    });
  } catch (error) {
    const info = classifyProviderError(error);
    return NextResponse.json({ chapters: [], ...providerErrorPayload(error) }, { status: providerErrorHttpStatus(info.kind) });
  }
}
