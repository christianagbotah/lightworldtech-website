import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import AboutPage from '@/components/pages/AboutPage';
import { contentText } from '@/lib/site-content';
import { getActiveTeamMembers, getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_about_title', 'About Lightworld Technologies Limited');
  const description = contentText(settings, 'seo_about_description', 'Learn about Lightworld Technologies Limited, a Ghanaian software and IT company based in Tema, Greater Accra, building digital products, enterprise systems, AI workflows and cloud solutions.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/about',
    openGraphTitle: title,
    absoluteTitle: true,
  });
}

export default async function About() {
  const [settings, team] = await Promise.all([getSiteSettings(), getActiveTeamMembers()]);
  return <PublicShell><AboutPage settings={settings} team={team} /></PublicShell>;
}
