import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MangaDetail } from '@/features/manga/manga-detail';
import { comickSource } from '@/sources/comick/comick-source';
import { mangaDexSource } from '@/sources/mangadex/mangadex-source';
import { weebCentralSource } from '@/sources/weebcentral/weebcentral-source';

async function resolve(id: string) {
  if (id.startsWith('wc-')) {
    try {
      const [manga, chapters] = await Promise.all([
        weebCentralSource.getManga(id),
        weebCentralSource.getChapters(id),
      ]);
      return { manga, chapters };
    } catch {
      return null;
    }
  }

  if (id.startsWith('ck-')) {
    try {
      const [manga, chapters] = await Promise.all([
        comickSource.getManga(id),
        comickSource.getChapters(id),
      ]);
      return { manga, chapters };
    } catch {
      return null;
    }
  }

  if (id.startsWith('md-')) {
    try {
      const [manga, chapters] = await Promise.all([
        mangaDexSource.getManga(id),
        mangaDexSource.getChapters(id),
      ]);
      return { manga, chapters };
    } catch {
      return null;
    }
  }

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await resolve(id);
  return data ? { title: data.manga.title, description: data.manga.description } : { title: 'Manga not found' };
}

export default async function MangaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await resolve(id);
  if (!data) notFound();
  return <MangaDetail manga={data.manga} chapters={data.chapters} />;
}
