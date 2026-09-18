import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import CareersPage from '@/components/pages/CareersPage';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Explore career opportunities and ways to build ambitious technology products with Lightworld Technologies in Ghana.',
  alternates: { canonical: '/careers' },
  openGraph: {
    title: 'Careers at Lightworld Technologies',
    description: 'Build ambitious technology products with Lightworld Technologies in Ghana.',
    url: '/careers',
  },
};

export default function Careers() {
  return <PublicShell><CareersPage /></PublicShell>;
}
