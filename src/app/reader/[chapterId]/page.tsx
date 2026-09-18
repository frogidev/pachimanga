import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProviderFailure } from '@/components/provider-failure';
import { ReaderView } from '@/features/reader/reader-view';
import { classifyProviderError } from '@/lib/source/provider-error';
import { getComickChapterContext } from '@/sources/comick/comick-source';
import { getMangaDexChapterContext } from '@/sources/mangadex/mangadex-source';
import { getWeebCentralChapterContext } from '@/sources/weebcentral/weebcentral-source';

async function resolve(chapterId: string) {
  const loader = chapterId.startsWith('wc-')
    ? getWeebCentralChapterContext
    : chapterId.startsWith('ckc-')
      ? getComickChapterContext
      : chapterId.startsWith('mdc-')
        ? getMangaDexChapterContext
        : null;

  if (loader) {
    try {
      return { data: await loader(chapterId), error: null };
    } catch (error) {
      return { data: null, error: classifyProviderError(error) };
    }
  }

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ chapterId: string }> }): Promise<Metadata> {
  const { chapterId } = await params;
  const result = await resolve(chapterId);
  if (!result) return { title: 'Reader' };
  if (result.error) return { title: result.error.title };
  return { title: `${result.data.manga.title} · ${result.data.chapter.title}` };
}

export default async function ReaderPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const result = await resolve(chapterId);
  if (!result) notFound();
  if (result.error) return <ProviderFailure info={result.error} />;
  return <ReaderView manga={result.data.manga} chapter={result.data.chapter} chapters={result.data.chapters} pages={result.data.pages} />;
}
