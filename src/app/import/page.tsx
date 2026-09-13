import { ImportPanel } from '@/components/ImportPanel';
import { PageHeading } from '@/components/page-heading';
export default function ImportPage(){return <div className="mx-auto max-w-5xl p-4 sm:p-8"><PageHeading eyebrow="Migration" title="Bring your manga with you" description="Scan screenshots or import backups from Tachiyomi, Mihon, and Tachimanga."/><ImportPanel/></div>}
