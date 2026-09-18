import 'server-only';

import { db } from '@/lib/db';
import type { SiteSettings } from '@/lib/site-content';

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany({
    select: { key: true, value: true },
  });

  return rows.reduce<SiteSettings>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function getActiveTeamMembers() {
  return db.teamMember.findMany({
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
}
