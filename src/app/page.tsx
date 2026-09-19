import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import HomePage from '@/components/pages/HomePage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_home_title', 'Lightworld Technologies Ltd | Software, Apps, AI & Digital Solutions');
  const description = contentText(settings, 'seo_home_description', 'Lightworld Technologies Ltd builds modern websites, mobile apps, enterprise software, AI-enabled workflows and cloud solutions, with IT training and technology consultancy from Ghana.');
  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, url: '/' },
  };
}

export default async function Home() {
  const settings = await getSiteSettings();
  return (
    <PublicShell>
      <HomePage settings={settings} />
    </PublicShell>
  );
}
