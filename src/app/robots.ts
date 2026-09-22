import type { MetadataRoute } from 'next';
import { getSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoConfig();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: seo.siteUrl + '/sitemap.xml',
    host: seo.siteUrl,
  };
}
