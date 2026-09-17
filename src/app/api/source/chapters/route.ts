import { NextResponse } from 'next/server';
import { classifyProviderError, providerErrorHttpStatus, providerErrorPayload } from '@/lib/source/provider-error';
import { comickSource } from '@/sources/comick/comick-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import { weebCentralSource } from '@/sources/weebcentral/weebcentral-source';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get('source') || '';
  const mangaId = params.get('mangaId') || '';
  if (!mangaId) return NextResponse.json({ chapters: [], error: { kind: 'upstream', title: 'Invalid request', message: 'Missing mangaId.', retryable: false } }, { status: 400 });
  try {
    const chapters =
      source === 'weebcentral' ? await weebCentralSource.getChapters(mangaId)
      : source === 'mangadex' ? await mangaDexSource.getChapters(mangaId)
      : source === 'comick' ? await comickSource.getChapters(mangaId)
      : null;
    if (!chapters) return NextResponse.json({ chapters: [], error: { kind: 'upstream', title: 'Unknown provider', message: 'Unknown source.', retryable: false } }, { status: 400 });
    return NextResponse.json({
      chapters: chapters.map((chapter) => ({ id: chapter.id, chapterNumber: chapter.chapterNumber, title: chapter.title })),
    });
  } catch (error) {
    const info = classifyProviderError(error);
    return NextResponse.json(
      { chapters: [], ...providerErrorPayload(error) },
      { status: providerErrorHttpStatus(info.kind) },
    );
  }
}
