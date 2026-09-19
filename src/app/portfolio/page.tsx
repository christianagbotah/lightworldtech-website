import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import PortfolioPage from '@/components/pages/PortfolioPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_portfolio_title', 'Portfolio & Digital Work');
  const description = contentText(settings, 'seo_portfolio_description', 'Explore the kinds of web, mobile, enterprise and digital product experiences Lightworld Technologies Ltd designs and engineers.');
  return {
    title,
    description,
    alternates: { canonical: '/portfolio' },
    openGraph: { title, description, url: '/portfolio' },
  };
}

export default async function Portfolio() {
  const settings = await getSiteSettings();
  return <PublicShell><PortfolioPage settings={settings} /></PublicShell>;
}
