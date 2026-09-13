import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReaderView } from '@/features/reader/reader-view';
import { getMockChapter, getMockChapters, getMockManga, getMockPages } from '@/lib/mock-data';
import { getComickChapterContext } from '@/sources/comick/comick-source';
import { getMangaDexChapterContext } from '@/sources/mangadex/mangadex-source';
import { getWeebCentralChapterContext } from '@/sources/weebcentral/weebcentral-source';

async function resolve(chapterId: string) {
  if (chapterId.startsWith('wc-')) {
    try {
      return await getWeebCentralChapterContext(chapterId);
    } catch {
      return null;
    }
  }

  if (chapterId.startsWith('ckc-')) {
    try {
      return await getComickChapterContext(chapterId);
    } catch {
      return null;
    }
  }

  if (chapterId.startsWith('mdc-')) {
    try {
      return await getMangaDexChapterContext(chapterId);
    } catch {
      return null;
    }
  }

  const chapter = getMockChapter(chapterId);
  if (!chapter) return null;
  const manga = getMockManga(chapter.mangaId);
  if (!manga) return null;
  return {
    manga,
    chapter,
    chapters: getMockChapters(manga.id),
    pages: getMockPages(chapter.id),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ chapterId: string }> }): Promise<Metadata> {
  const { chapterId } = await params;
  const data = await resolve(chapterId);
  return { title: data ? `${data.manga.title} · ${data.chapter.title}` : 'Reader' };
}

export default async function ReaderPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const data = await resolve(chapterId);
  if (!data) notFound();
  return <ReaderView manga={data.manga} chapter={data.chapter} chapters={data.chapters} pages={data.pages} />;
}
