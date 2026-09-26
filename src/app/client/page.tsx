import type { Metadata } from 'next';
import ClientPortalPage from '@/components/client/ClientPortalPage';
import ClientKnowledgeWidget from '@/components/client/ClientKnowledgeWidget';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Secure Lightworld Technologies client project and support workspace.',
  robots: { index: false, follow: false },
};

export default function ClientPage() {
  return (
    <>
      <ClientPortalPage />
      <ClientKnowledgeWidget />
    </>
  );
}
