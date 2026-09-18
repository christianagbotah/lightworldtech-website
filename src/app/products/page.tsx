import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ProductsPage from '@/components/pages/ProductsPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_products_title', 'Digital Products');
  const description = contentText(settings, 'seo_products_description', 'Discover digital products and platforms being developed by Lightworld Technologies for teams, businesses and institutions.');
  return {
    title,
    description,
    alternates: { canonical: '/products' },
    openGraph: { title, description, url: '/products' },
  };
}

export default async function Products() {
  const settings = await getSiteSettings();
  return <PublicShell><ProductsPage settings={settings} /></PublicShell>;
}
