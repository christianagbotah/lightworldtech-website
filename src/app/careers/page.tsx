import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import CareersPage from '@/components/pages/CareersPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_careers_title', 'Careers');
  const description = contentText(settings, 'seo_careers_description', 'Explore career opportunities and ways to build ambitious technology products with Lightworld Technologies in Ghana.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/careers',
    openGraphTitle: title + ' at Lightworld Technologies',
  });
}

export default async function Careers() {
  const settings = await getSiteSettings();
  return <PublicShell><CareersPage settings={settings} /></PublicShell>;
}
