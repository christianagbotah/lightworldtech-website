import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import TeamPage from '@/components/pages/TeamPage';
import { contentText } from '@/lib/site-content';
import { getActiveTeamMembers, getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_team_title', 'Leadership Team');
  const description = contentText(settings, 'seo_team_description', 'Meet the executive leadership of Lightworld Technologies Ltd.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/team',
    openGraphTitle: title + ' | Lightworld Technologies',
  });
}

export default async function Team() {
  const [settings, team] = await Promise.all([getSiteSettings(), getActiveTeamMembers()]);
  return (
    <PublicShell>
      <TeamPage settings={settings} team={team} />
    </PublicShell>
  );
}
