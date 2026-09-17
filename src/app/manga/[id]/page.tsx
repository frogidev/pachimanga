import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProviderFailure } from '@/components/provider-failure';
import { ProviderRefreshStatus } from '@/components/provider-refresh-status';
import { MangaDetail } from '@/features/manga/manga-detail';
import { classifyProviderError } from '@/lib/source/provider-error';
import { comickSource } from '@/sources/comick/comick-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import { weebCentralSource } from '@/sources/weebcentral/weebcentral-source';

async function resolve(id: string) {
  const source = id.startsWith('wc-')
    ? weebCentralSource
    : id.startsWith('ck-')
      ? comickSource
      : id.startsWith('md-')
        ? mangaDexSource
        : null;
  if (!source) return null;

  try {
    const [manga, chapters] = await Promise.all([
      source.getManga(id),
      source.getChapters(id),
    ]);
    return { data: { manga, chapters }, error: null };
  } catch (error) {
    return { data: null, error: classifyProviderError(error) };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await resolve(id);
  if (!result) return { title: 'Manga not found' };
  if (result.error) return { title: result.error.title };
  return { title: result.data.manga.title, description: result.data.manga.description };
}

export default async function MangaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await resolve(id);
  if (!result) notFound();
  if (result.error) return <ProviderFailure info={result.error} />;
  return (
    <>
      <ProviderRefreshStatus mangaId={result.data.manga.id} sourceId={result.data.manga.sourceId} />
      <MangaDetail manga={result.data.manga} chapters={result.data.chapters} />
    </>
  );
}
