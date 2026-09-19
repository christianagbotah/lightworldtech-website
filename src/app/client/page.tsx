import type { Metadata } from 'next';
import ClientPortalPage from '@/components/pages/ClientPortalPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Secure project, document and support workspace for Lightworld Technologies clients.',
  alternates: { canonical: '/client' },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ClientPortal() {
  return <ClientPortalPage />;
}
