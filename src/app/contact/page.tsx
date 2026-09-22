import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ContactPage from '@/components/pages/ContactPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = contentText(settings, 'seo_contact_title', 'Contact Lightworld Technologies | Tema, Ghana');
  const description = contentText(settings, 'seo_contact_description', 'Contact Lightworld Technologies in Tema, Greater Accra, Ghana for website development, mobile apps, enterprise software, AI automation, cloud projects, IT training and technology consulting.');
  return buildPageMetadata(buildSeoConfig(settings), {
    title,
    description,
    path: '/contact',
    absoluteTitle: true,
  });
}

export default async function Contact() {
  const settings = await getSiteSettings();
  return <PublicShell><ContactPage settings={settings} /></PublicShell>;
}
