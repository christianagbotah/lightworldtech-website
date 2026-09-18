import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.lightworldtech.com';
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: base + '/services', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: base + '/portfolio', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/products', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: base + '/about', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: base + '/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/careers', lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: base + '/contact', lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
  ];
}
