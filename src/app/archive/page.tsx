'use client';

import { LocalArchiveReader } from '@/components/archive/LocalArchiveReader';
import { PageHeading } from '@/components/page-heading';

export default function ArchivePage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading
        eyebrow="Local Files"
        title="Archive Reader"
        description="Open CBZ, ZIP, and other comic archives directly in your browser. Files never leave your device."
      />
      <LocalArchiveReader />
    </div>
  );
}