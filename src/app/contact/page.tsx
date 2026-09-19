import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ContactPage from '@/components/pages/ContactPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_contact_title', 'Contact & Start a Project');
  const description = contentText(settings, 'seo_contact_description', 'Talk to Lightworld Technologies Ltd about a website, mobile app, enterprise system, AI workflow, IT training, cloud project or technology consultancy.');
  return {
    title,
    description,
    alternates: { canonical: '/contact' },
    openGraph: { title, description, url: '/contact' },
  };
}

export default async function Contact() {
  const settings = await getSiteSettings();
  return <PublicShell><ContactPage settings={settings} /></PublicShell>;
}
