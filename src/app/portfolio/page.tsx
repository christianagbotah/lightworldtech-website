import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PortfolioPage from '@/components/pages/PortfolioPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

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

export default async function Portfolio() {
  const settings = await getSiteSettings();
  return <PublicShell><PortfolioPage settings={settings} /></PublicShell>;
}
