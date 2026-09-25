import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import IndustriesPage from '@/components/pages/IndustriesPage';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';
import { buildPageMetadata } from '@/lib/seo-config';
import { getSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoConfig();
  const title = 'Industry Software Solutions | Lightworld Technologies';
  const description = 'Explore Lightworld Technologies software, AI, mobile, cloud and digital solutions for education, manufacturing, logistics, retail, professional services and startups.';
  return buildPageMetadata(seo, { title, description, path: '/industries', absoluteTitle: true });
}

export default async function Industries() {
  const seo = await getSeoConfig();
  const title = 'Industry Software Solutions | Lightworld Technologies';
  const description = 'Explore Lightworld Technologies software, AI, mobile, cloud and digital solutions for education, manufacturing, logistics, retail, professional services and startups.';

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/industries" name={title} description={description} pageType="CollectionPage" />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Industry solutions', path: '/industries' }]} />
      <IndustriesPage />
    </PublicShell>
  );
}
