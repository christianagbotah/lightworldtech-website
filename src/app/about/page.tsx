import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import AboutPage from '@/components/pages/AboutPage';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Lightworld Technologies Limited, a Ghanaian technology company building useful digital products, enterprise software and modern IT solutions.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Lightworld Technologies',
    description: 'A Ghanaian technology company building useful digital products, enterprise software and modern IT solutions.',
    url: '/about',
  },
};

export default function About() {
  return <PublicShell><AboutPage /></PublicShell>;
}
