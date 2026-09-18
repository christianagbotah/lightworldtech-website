import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import CareersPage from '@/components/pages/CareersPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_careers_title', 'Careers');
  const description = contentText(settings, 'seo_careers_description', 'Explore career opportunities and ways to build ambitious technology products with Lightworld Technologies in Ghana.');
  return {
    title,
    description,
    alternates: { canonical: '/careers' },
    openGraph: { title: title + ' at Lightworld Technologies', description, url: '/careers' },
  };
}

export default async function Careers() {
  const settings = await getSiteSettings();
  return <PublicShell><CareersPage settings={settings} /></PublicShell>;
}
