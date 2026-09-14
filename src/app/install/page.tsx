import type { Metadata } from 'next';
import { PwaInstall } from '@/features/install/pwa-install';

export const metadata: Metadata = {
  title: 'Install',
  description: 'Install Pachimanga as a free PWA on iPhone, iPad, Android and desktop browsers.',
};

export default function InstallPage() {
  return <PwaInstall />;
}
