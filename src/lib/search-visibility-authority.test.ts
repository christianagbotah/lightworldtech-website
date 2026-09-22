import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('search visibility and entity authority', () => {
  test('uses the apex domain as the canonical site and redirects www', () => {
    const seo = source('src/lib/seo-config.ts');
    const nextConfig = source('next.config.ts');

    expect(seo).toContain("const DEFAULT_SITE_URL = 'https://lightworldtech.com'");
    expect(seo).toContain("alternates: { canonical: url }");
    expect(nextConfig).toContain("value: 'www.lightworldtech.com'");
    expect(nextConfig).toContain("destination: 'https://lightworldtech.com/:path*'");
    expect(nextConfig).toContain('permanent: true');
  });

  test('organization schema presents one strong Lightworld entity', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain("config.siteUrl + '/#organization'");
    expect(schema).toContain('legalName: config.legalName');
    expect(schema).toContain("'Lightworld Technologies Limited'");
    expect(schema).toContain('hasOfferCatalog');
    expect(schema).toContain('award: companyProfile.recognition');
    expect(schema).toContain('subjectOf');
    expect(schema).toContain("'Greater Accra Region'");
  });

  test('homepage targets the exact brand and exposes a natural Ghana entity statement', () => {
    const page = source('src/app/page.tsx');
    const home = source('src/components/pages/HomePage.tsx');

    expect(page).toContain('Lightworld Technologies Limited | Software Company in Ghana');
    expect(page).toContain('absoluteTitle: true');
    expect(home).toContain('home_entity_summary');
    expect(home).toContain('Ghanaian software and IT company based in Tema, Greater Accra');
    expect(home).toContain('Tema · Greater Accra · Ghana');
  });

  test('legacy production SEO settings are conditionally migrated without invented verification or social identities', () => {
    const migration = source('prisma/migrations/20260922002000_search_visibility_entity_authority/migration.sql');

    expect(migration).toContain("'https://lightworldtech.com'");
    expect(migration).toContain("'Lightworld Technologies'");
    expect(migration).toContain("'Tema'");
    expect(migration).toContain("'Greater Accra'");
    expect(migration).toContain("'en_GH'");
    expect(migration).toContain("'Robert Yaw Essuon'");
    expect(migration).not.toContain('seo_google_verification');
    expect(migration).not.toContain('seo_bing_verification');
    expect(migration).not.toContain('social_linkedin');
    expect(migration).not.toContain('social_facebook');
  });

  test('page metadata strengthens brand and Ghana service intent without keyword-stuffing visible navigation', () => {
    const services = source('src/app/services/page.tsx');
    const contact = source('src/app/contact/page.tsx');
    const newsroom = source('src/app/newsroom/page.tsx');
    const cms = source('src/lib/site-content.ts');

    expect(services).toContain('Software Development, Web & Mobile App Services in Ghana');
    expect(contact).toContain('Contact Lightworld Technologies | Tema, Ghana');
    expect(newsroom).toContain('Lightworld Technologies Awards, News & Company Facts');
    expect(cms).toContain("{ title: 'Careers', desc: 'Talent network and opportunities'");
    expect(cms).toContain("{ label: 'About', href: '/about' }");
  });

  test('sitemap uses real CMS freshness instead of inventing now on every request', () => {
    const sitemap = source('src/app/sitemap.ts');

    expect(sitemap).toContain('db.siteSetting.aggregate');
    expect(sitemap).toContain('_max: { updatedAt: true }');
    expect(sitemap).not.toContain('const now = new Date()');
  });

  test('verified Maps identity is connected to schema and public contact details', () => {
    const profile = source('src/lib/company-profile.ts');
    const schema = source('src/components/ui/json-ld.tsx');
    const contact = source('src/components/pages/ContactPage.tsx');

    expect(profile).toContain('ChIJl7EfYil_3w8R126pXLqlMgw');
    expect(schema).toContain('companyProfile.googleMapsUrl');
    expect(contact).toContain('Mon–Fri · 08:30–17:30 GMT');
    expect(contact).toContain('Sat · 14:00–16:00 GMT');
  });

  test('leadership identity uses the corrected managing director name', () => {
    const profile = source('src/lib/company-profile.ts');
    const seed = source('prisma/seed.ts');

    expect(profile).toContain('Robert Yaw Essuon');
    expect(seed).toContain('Robert Yaw Essuon');
    expect(profile).not.toContain('Rober Yaw Essuon');
    expect(seed).not.toContain('Rober Yaw Essuon');
  });
});
