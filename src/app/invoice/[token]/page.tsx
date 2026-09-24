import type { Metadata } from 'next';
import PublicInvoicePage from '@/components/invoice/PublicInvoicePage';

export const metadata: Metadata = {
  title: 'Secure invoice',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicInvoicePage token={token} />;
}
