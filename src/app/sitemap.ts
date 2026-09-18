import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.lightworldtech.com';
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: base + '/services', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: base + '/portfolio', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/products', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: base + '/team', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: base + '/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/careers', lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: base + '/contact', lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: base + '/trust', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: base + '/privacy', lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: base + '/cookies', lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: base + '/terms', lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];

  try {
    const posts = await db.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return [
      ...core,
      ...posts.map((post) => ({
        url: base + '/blog/' + post.slug,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.65,
      })),
    ];
  } catch {
    // Core marketing URLs remain discoverable even if the CMS database is temporarily unavailable.
    return core;
  }
}
