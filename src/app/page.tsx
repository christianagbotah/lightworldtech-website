import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import HomePage from '@/components/pages/HomePage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { db } from '@/lib/db';
import { safeNavigationHref } from '@/lib/navigation-content';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_home_title', 'Lightworld Technologies Limited | Software Company in Ghana');
  const description = contentText(settings, 'seo_home_description', 'Lightworld Technologies Limited is a Ghanaian software and IT company in Tema, Greater Accra, building websites, mobile apps, enterprise software, AI automation and cloud solutions, with IT training and technology consulting.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/',
    absoluteTitle: true,
  });
}

export default async function Home() {
  const [settings, initialWork] = await Promise.all([
    getSiteSettings(),
    db.portfolioProject.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      take: 3,
      select: { title: true, category: true, description: true, image: true, url: true },
    }).then((projects) => projects.map((project) => ({
      title: project.title,
      category: project.category || 'Digital product',
      description: project.description,
      image: project.image || '/images/hero-slide-5.png',
      url: project.url ? safeNavigationHref(project.url, '') : '',
    }))).catch((error) => {
      console.error('Failed to preload featured portfolio work:', error);
      return [];
    }),
  ]);

  return (
    <PublicShell>
      <HomePage settings={settings} initialWork={initialWork} />
    </PublicShell>
  );
}
