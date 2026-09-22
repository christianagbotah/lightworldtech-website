import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ContactPage from '@/components/pages/ContactPage';
import { contentText } from '@/lib/site-content';
import { getSiteSettings } from '@/lib/site-content-server';
import { buildPageMetadata, buildSeoConfig } from '@/lib/seo-config';
import { BreadcrumbJsonLd, EntityWebPageJsonLd } from '@/components/ui/json-ld';

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
  const seo = buildSeoConfig(settings);
  const name = contentText(settings, 'seo_contact_title', 'Contact Lightworld Technologies | Tema, Ghana');
  const description = contentText(settings, 'seo_contact_description', 'Contact Lightworld Technologies in Tema, Greater Accra, Ghana for website development, mobile apps, enterprise software, AI automation, cloud projects, IT training and technology consulting.');

  return (
    <PublicShell>
      <EntityWebPageJsonLd config={seo} path="/contact" name={name} description={description} pageType="ContactPage" />
      <BreadcrumbJsonLd config={seo} items={[{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]} />
      <ContactPage settings={settings} />
    </PublicShell>
  );
}
