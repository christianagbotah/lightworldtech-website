import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import AboutPage from '@/components/pages/AboutPage';
import { contentText } from '@/lib/site-content';
import { getActiveTeamMembers, getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_about_title', 'About');
  const description = contentText(settings, 'seo_about_description', 'Learn about Lightworld Technologies Ltd, a Ghanaian technology company building useful digital products, enterprise software and modern IT solutions.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/about',
    openGraphTitle: title + ' | Lightworld Technologies',
  });
}

export default async function About() {
  const [settings, team] = await Promise.all([getSiteSettings(), getActiveTeamMembers()]);
  return <PublicShell><AboutPage settings={settings} team={team} /></PublicShell>;
}
