import type { Metadata } from 'next';
import ClientResetPasswordPage from '@/components/client/ClientResetPasswordPage';

export const metadata: Metadata = {
  title: 'Reset Client Portal Password',
  description: 'Reset a secure Lightworld Technologies client portal password.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function ResetClientPassword() {
  return <ClientResetPasswordPage />;
}
