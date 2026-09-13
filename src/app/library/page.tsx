import { LibraryView } from '@/components/LibraryView';
import { PageHeading } from '@/components/page-heading';
export default function CloudLibraryPage(){return <div className="mx-auto max-w-6xl p-4 sm:p-8"><PageHeading eyebrow="Cloud sync" title="Synced library" description="Titles imported or synced to your Pachimanga account."/><LibraryView/></div>}
