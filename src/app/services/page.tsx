import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ServicesPage from '@/components/pages/ServicesPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, ServicesCollectionJsonLd } from '@/components/ui/json-ld';
import { serviceSearchLandings } from '@/lib/service-search-content';

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
  const seo = buildSeoConfig(settings);

  return (
    <PublicShell>
      <ServicesCollectionJsonLd
        config={seo}
        services={serviceSearchLandings.map((service) => ({
          name: service.title,
          path: '/services/' + service.slug,
          description: service.description,
        }))}
      />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }]} />
      <ServicesPage settings={settings} />
    </PublicShell>
  );
}
