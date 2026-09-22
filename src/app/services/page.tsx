import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ServicesPage from '@/components/pages/ServicesPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_services_title', 'Software Development, Web & Mobile App Services in Ghana');
  const description = contentText(settings, 'seo_services_description', 'Explore software development, website development, mobile apps, enterprise systems, AI automation, cloud, cybersecurity, SEO, IT training and technology consulting from Lightworld Technologies in Ghana.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/services',
  });
}

export default async function Services() {
  const settings = await getSiteSettings();
  return <PublicShell><ServicesPage settings={settings} /></PublicShell>;
}
