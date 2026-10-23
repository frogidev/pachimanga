import { ImportPanel } from '@/components/ImportPanel';
import { PageHeading } from '@/components/page-heading';

export default function ImportPage() {
  return (
    <div className="app-page max-w-5xl">
      <PageHeading eyebrow="importpage.kicker" title="importpage.title" description="importpage.sub" />
      <ImportPanel />
    </div>
  );
}
