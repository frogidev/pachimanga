'use client';

import { LocalArchiveReader } from '@/components/archive/LocalArchiveReader';
import { PageHeading } from '@/components/page-heading';

export default function ArchivePage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading
        eyebrow="archivepage.kicker"
        title="archivepage.title"
        description="archivepage.sub"
      />
      <LocalArchiveReader />
    </div>
  );
}