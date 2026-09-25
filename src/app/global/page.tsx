import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import GlobalPage from '@/components/pages/GlobalPage';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_global_title', 'Global Software Engineering & Digital Transformation | Lightworld Technologies');
  const description = contentText(settings, 'seo_global_description', 'Work with Ghana-based Lightworld Technologies for remote software engineering, web and mobile products, enterprise systems, AI automation, cloud, security and technology advisory.');
  return buildPageMetadata(buildSeoConfig(settings), { title, description, path: '/global', openGraphTitle: title, absoluteTitle: true });
}

export default async function GlobalDelivery() {
  const settings = await getSiteSettings();
  const seo = buildSeoConfig(settings);
  const name = contentText(settings, 'seo_global_title', 'Global Software Engineering & Digital Transformation | Lightworld Technologies');
  const description = contentText(settings, 'seo_global_description', 'Work with Ghana-based Lightworld Technologies for remote software engineering, web and mobile products, enterprise systems, AI automation, cloud, security and technology advisory.');

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/global" name={name} description={description} />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Global delivery', path: '/global' }]} />
      <GlobalPage settings={settings} />
    </PublicShell>
  );
}
