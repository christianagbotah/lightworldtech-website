import 'server-only';

import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import type { SiteSettings } from '@/lib/site-content';

const readSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const rows = await db.siteSetting.findMany({
        select: { key: true, value: true },
      });

      return rows.reduce<SiteSettings>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    } catch {
      // Public pages all have canonical content fallbacks. A CMS outage or a
      // database-less CI build must not take down the public shell / 404 page.
      return {};
    }
  },
  ['public-site-settings'],
  { revalidate: 300, tags: ['site-settings'] },
);

export async function getSiteSettings(): Promise<SiteSettings> {
  return readSiteSettings();
}

export async function getActiveTeamMembers() {
  try {
    return await db.teamMember.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        role: true,
        bio: true,
        image: true,
        email: true,
        linkedin: true,
        twitter: true,
      },
    });
  } catch {
    // Team/About pages fall back to the verified canonical leadership profile.
    return [];
  }
}


export async function getLatestPublishedPosts(limit = 3) {
  try {
    return await db.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(6, Math.max(1, limit)),
      select: {
        title: true,
        slug: true,
        excerpt: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}
