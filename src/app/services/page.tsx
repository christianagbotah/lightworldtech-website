import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ServicesPage from '@/components/pages/ServicesPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_services_title', 'Software, App, Web & IT Services');
  const description = contentText(settings, 'seo_services_description', 'Explore web development, mobile apps, enterprise software, AI automation, cloud and DevOps, security engineering, SEO, IT training and consultancy from Lightworld Technologies Ltd.');
  return {
    title,
    description,
    alternates: { canonical: '/services' },
    openGraph: { title, description, url: '/services' },
  };
}

export default async function Services() {
  const settings = await getSiteSettings();
  return <PublicShell><ServicesPage settings={settings} /></PublicShell>;
}
