'use client';

import { LocalArchiveReader } from '@/components/archive/LocalArchiveReader';
import { OfflineDownloadManager } from '@/components/offline-download-manager';
import { PageHeading } from '@/components/page-heading';

export default function ArchivePage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading
        eyebrow="archivepage.kicker"
        title="archivepage.title"
        description="archivepage.sub"
      />
      <div className="mt-6 grid gap-6">
        <OfflineDownloadManager />
        <LocalArchiveReader />
      </div>
    </div>
  );
}