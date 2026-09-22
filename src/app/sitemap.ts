import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { getSeoConfig } from '@/lib/seo-config';
import { serviceSearchPages } from '@/lib/service-search-pages';

export const dynamic = 'force-dynamic';

function coreSitemap(base: string, lastModified?: Date): MetadataRoute.Sitemap {
  const freshness = lastModified ? { lastModified } : {};

  return [
    { url: base, ...freshness, changeFrequency: 'weekly', priority: 1 },
    { url: base + '/services', ...freshness, changeFrequency: 'monthly', priority: 0.9 },
    ...serviceSearchPages.map((service) => ({
      url: base + '/services/' + service.slug,
      ...freshness,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
    { url: base + '/portfolio', ...freshness, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/products', ...freshness, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/about', ...freshness, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/team', ...freshness, changeFrequency: 'monthly', priority: 0.7 },
    { url: base + '/blog', ...freshness, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/careers', ...freshness, changeFrequency: 'weekly', priority: 0.6 },
    { url: base + '/contact', ...freshness, changeFrequency: 'yearly', priority: 0.8 },
    { url: base + '/newsroom', ...freshness, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/trust', ...freshness, changeFrequency: 'monthly', priority: 0.6 },
    { url: base + '/privacy', ...freshness, changeFrequency: 'yearly', priority: 0.3 },
    { url: base + '/terms', ...freshness, changeFrequency: 'yearly', priority: 0.3 },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoConfig();
  const base = seo.siteUrl;

  try {
    const [posts, settingsFreshness] = await Promise.all([
      db.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.siteSetting.aggregate({
        _max: { updatedAt: true },
      }),
    ]);

    return [
      ...coreSitemap(base, settingsFreshness._max.updatedAt || undefined),
      ...posts.map((post) => ({
        url: base + '/blog/' + post.slug,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.65,
      })),
    ];
  } catch {
    // Core marketing URLs remain discoverable even if the CMS database is temporarily unavailable.
    // Omitting lastModified is more trustworthy than inventing a fresh timestamp.
    return coreSitemap(base);
  }
}
