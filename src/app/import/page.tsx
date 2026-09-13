import { ImportPanel } from '@/components/ImportPanel';
import { PageHeading } from '@/components/page-heading';

export default function ImportPage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading eyebrow="Migration" title="Bring your manga with you" description="Scan screenshots or import backups from Tachiyomi, Mihon, and Tachimanga without rebuilding your library by hand." />
      <ImportPanel />
    </div>
  );
}
