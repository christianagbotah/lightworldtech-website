import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PortfolioPage from '@/components/pages/PortfolioPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { db } from '@/lib/db';
import { safeNavigationHref } from '@/lib/navigation-content';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_portfolio_title', 'Software & Digital Product Portfolio in Ghana');
  const description = contentText(settings, 'seo_portfolio_description', 'Explore web, mobile, enterprise software and digital product work designed and engineered by Lightworld Technologies in Ghana.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/portfolio',
  });
}

function parsePortfolioTags(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

export default async function Portfolio() {
  const [settings, initialProjects] = await Promise.all([
    getSiteSettings(),
    db.portfolioProject.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        technologies: true,
        featured: true,
        image: true,
        url: true,
      },
    }).then((projects) => projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category || 'Digital Product',
      tags: parsePortfolioTags(project.technologies),
      featured: project.featured,
      image: project.image || undefined,
      clientUrl: project.url ? safeNavigationHref(project.url, '') : undefined,
    }))).catch((error) => {
      console.error('Failed to preload published portfolio projects:', error);
      return [];
    }),
  ]);

  return <PublicShell><PortfolioPage settings={settings} initialProjects={initialProjects} /></PublicShell>;
}
