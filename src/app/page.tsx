import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import HomePage from '@/components/pages/HomePage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_home_title', 'Lightworld Technologies Limited | Software Company in Ghana');
  const description = contentText(settings, 'seo_home_description', 'Lightworld Technologies Limited is a Ghanaian software and IT company in Tema, Greater Accra, building websites, mobile apps, enterprise software, AI automation and cloud solutions, with IT training and technology consulting.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/',
    absoluteTitle: true,
  });
}

export default async function Home() {
  const settings = await getSiteSettings();
  return (
    <PublicShell>
      <HomePage settings={settings} />
    </PublicShell>
  );
}
