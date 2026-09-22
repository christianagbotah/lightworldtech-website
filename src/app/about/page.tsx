import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import AboutPage from '@/components/pages/AboutPage';
import { contentText } from '@/lib/site-content';
import { getActiveTeamMembers, getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

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
  const seo = buildSeoConfig(settings);
  const name = contentText(settings, 'seo_about_title', 'About Lightworld Technologies Limited');
  const description = contentText(settings, 'seo_about_description', 'Learn about Lightworld Technologies Limited, a Ghanaian software and IT company based in Tema, Greater Accra, building digital products, enterprise systems, AI workflows and cloud solutions.');

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/about" name={name} description={description} pageType="AboutPage" />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'About Lightworld Technologies', path: '/about' }]} />
      <AboutPage settings={settings} team={team} />
    </PublicShell>
  );
}
