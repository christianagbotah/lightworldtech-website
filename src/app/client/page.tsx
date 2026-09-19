import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ClientPortalPage from '@/components/pages/ClientPortalPage';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Secure client workspace for Lightworld Technologies Ltd projects, milestones, deliverables and support.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/client' },
};

export default function ClientPortalRoute() {
  return (
    <PublicShell>
      <ClientPortalPage />
    </PublicShell>
  );
}
