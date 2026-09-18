import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ServicesPage from '@/components/pages/ServicesPage';

export const metadata: Metadata = {
  title: 'Software, App, Web & IT Services',
  description: 'Explore web development, mobile apps, enterprise software, AI automation, cloud and DevOps, security engineering, SEO, IT training and consultancy from Lightworld Technologies.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'Software, App, Web & IT Services',
    description: 'Digital engineering, cloud, AI automation, enterprise systems, training and technology consultancy from Ghana.',
    url: '/services',
  },
};

export default function Services() {
  return <PublicShell><ServicesPage /></PublicShell>;
}
