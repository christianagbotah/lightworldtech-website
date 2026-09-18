import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PortfolioPage from '@/components/pages/PortfolioPage';

export const metadata: Metadata = {
  title: 'Portfolio & Digital Work',
  description: 'Explore the kinds of web, mobile, enterprise and digital product experiences Lightworld Technologies designs and engineers.',
  alternates: { canonical: '/portfolio' },
  openGraph: {
    title: 'Lightworld Technologies Portfolio',
    description: 'Web, mobile, enterprise and digital product work from Lightworld Technologies.',
    url: '/portfolio',
  },
};

export default function Portfolio() {
  return <PublicShell><PortfolioPage /></PublicShell>;
}
