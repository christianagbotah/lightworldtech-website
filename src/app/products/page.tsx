import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ProductsPage from '@/components/pages/ProductsPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_products_title', 'Software Products & Business Platforms');
  const description = contentText(settings, 'seo_products_description', 'Discover software products, enterprise platforms and digital systems being developed by Lightworld Technologies for businesses, institutions and teams in Ghana and beyond.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/products',
  });
}

export default async function Products() {
  const settings = await getSiteSettings();
  return <PublicShell><ProductsPage settings={settings} /></PublicShell>;
}
