import Link from 'next/link';
import Image from 'next/image';
import { PageHeading } from '@/components/page-heading';

export default function UpdatesPage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading eyebrow="Latest" title="Updates" subtitle="See newly available chapters for the manga already in your library." />
      <div className="surface-card mt-6 flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <Image src="/ai-art/empty-shelves.avif" alt="Empty manga shelves awaiting new chapters" width={256} height={171} loading="lazy" className="h-auto w-64 rounded-xl object-cover" />
        <h2 className="mt-2 text-lg font-semibold text-zinc-200">Nothing new yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Once you add source-backed titles to your library, Pachimanga can compare the latest chapter when you open Updates. Background polling is intentionally avoided to reduce provider load.</p>
        <Link href="/browse" className="button-primary mt-5 px-4 py-2.5 text-sm">Browse manga</Link>
      </div>
    </div>
  );
}
