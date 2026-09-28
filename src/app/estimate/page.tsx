import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ProjectEstimatorPage from '@/components/pages/ProjectEstimatorPage';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildPageMetadata(buildSeoConfig(settings), {
    title: 'Project Scope Builder | Lightworld Technologies',
    description: 'Build an indicative software, website, mobile, AI or cloud project scope and send the structured brief to Lightworld Technologies.',
    path: '/estimate',
    absoluteTitle: true,
  });
}

export default async function EstimatePage() {
  const settings = await getSiteSettings();
  const seo = buildSeoConfig(settings);
  const name = 'Project Scope Builder | Lightworld Technologies';
  const description = 'Build an indicative project scope and send a structured brief to Lightworld Technologies.';

  return (
    <PublicShell settings={settings}>
      <EntityWebPageJsonLd config={seo} path="/estimate" name={name} description={description} pageType="WebPage" />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Project Scope Builder', path: '/estimate' }]} />
      <ProjectEstimatorPage />
    </PublicShell>
  );
}