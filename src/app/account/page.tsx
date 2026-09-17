import { AccountSettings } from '@/components/account-settings';
import { PageHeading } from '@/components/page-heading';

export default function AccountPage() {
  return (
    <div className="app-page max-w-4xl">
      <PageHeading
        eyebrow="Account"
        title="Your Pachimanga account"
        subtitle="Manage your profile, password, recovery options and this device's session without leaving the app shell."
      />
      <div className="mt-6">
        <AccountSettings />
      </div>
    </div>
  );
}
