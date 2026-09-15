import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';
import { PachiMascotImg } from '@/components/pachi-mascot-img';

export default function UpdatesPage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading eyebrow="Latest" title="Updates" subtitle="See newly available chapters for the manga already in your library." />
      <div className="surface-card mt-6 flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <PachiMascotImg width={128} height={85} className="h-auto w-32 rounded-xl object-cover" />
        <h2 className="mt-2 text-lg font-semibold text-zinc-200">Nothing new yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Once you add source-backed titles to your library, Pachimanga can compare the latest chapter when you open Updates. Background polling is intentionally avoided to reduce provider load.</p>
        <Link href="/browse" className="button-primary mt-5 px-4 py-2.5 text-sm">Browse manga</Link>
      </div>
    </div>
  );
}
