import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withProviderConcurrency } from '@/lib/source/provider-limiter';
import { classifyProviderError, providerErrorHttpStatus, providerErrorPayload } from '@/lib/source/provider-error';
import { getSource } from '@/sources/core/registry';

const PROVIDERS = new Set(['weebcentral', 'zonatmo']);

/** Page image URLs of one chapter, used by "save all chapters offline". Authenticated and provider-limited. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get('source') || '';
  const chapterId = params.get('chapterId') || '';
  if (!chapterId || chapterId.length > 160 || !PROVIDERS.has(source)) {
    return NextResponse.json({ pages: [], error: { kind: 'upstream', title: 'Invalid request', message: 'Missing or invalid chapter.', retryable: false } }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ pages: [], error: { kind: 'upstream', title: 'Authentication required', message: 'Sign in before loading pages.', retryable: false } }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const provider = getSource(source);
  if (!provider) return NextResponse.json({ pages: [], error: { kind: 'upstream', title: 'Unknown provider', message: 'Unknown source.', retryable: false } }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });

  try {
    const pages = await withProviderConcurrency(`${user.id}:${source}`, () => provider.getChapterPages(chapterId));
    return NextResponse.json({ pages: pages.map((page) => ({ index: page.index, imageUrl: page.imageUrl })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const info = classifyProviderError(error);
    return NextResponse.json({ pages: [], ...providerErrorPayload(error) }, { status: providerErrorHttpStatus(info.kind), headers: { 'Cache-Control': 'private, no-store' } });
  }
}
