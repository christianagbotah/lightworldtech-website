import 'server-only';

import { db } from '@/lib/db';
import type { SiteSettings } from '@/lib/site-content';

export async function getSiteSettings(): Promise<SiteSettings> {
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
