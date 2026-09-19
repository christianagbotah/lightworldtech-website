import type { Metadata } from 'next';
import ClientActivatePage from '@/components/client/ClientActivatePage';

export const metadata: Metadata = {
  title: 'Activate Client Portal',
  description: 'Activate a secure Lightworld Technologies client portal account.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ActivateClientAccount({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ClientActivatePage token={params.token || ''} />;
}
