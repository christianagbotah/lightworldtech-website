import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import BlogPage from '@/components/pages/BlogPage';

export const metadata: Metadata = {
  title: 'Technology Insights',
  description: 'Practical insights from Lightworld Technologies on software, websites, mobile products, business systems, SEO, cloud and digital transformation.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Lightworld Technologies Insights',
    description: 'Practical thinking on software, product engineering and digital transformation.',
    url: '/blog',
  },
};

export default function Blog() {
  return <PublicShell><BlogPage /></PublicShell>;
}
