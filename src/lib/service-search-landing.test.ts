import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('service search landing pages', () => {
  test('defines eight distinct crawlable service intents', () => {
    const content = source('src/lib/service-search-content.ts');
    for (const slug of [
      'web-development',
      'mobile-app-development',
      'software-development',
      'ai-automation',
      'cloud-devops',
      'security-engineering',
      'seo-digital-performance',
      'it-training',
    ]) {
      expect(content).toContain("slug: '" + slug + "'");
    }

    expect(content).toContain('Web Development Company in Ghana');
    expect(content).toContain('Software Development Company in Ghana');
    expect(content).toContain('IT Training Institute & Technology Consulting Ghana');
  });

  test('renders service pages on the server with canonical metadata and structured data', () => {
    const page = source('src/app/services/[slug]/page.tsx');
    const schema = source('src/components/ui/json-ld.tsx');

    expect(page).toContain("export const dynamic = 'force-dynamic'");
    expect(page).toContain('absoluteTitle: true');
    expect(page).toContain("<ServiceJsonLd");
    expect(page).toContain("<BreadcrumbJsonLd");
    expect(page).toContain("path: '/services/' + service.slug");
    expect(page).toContain('getCmsService(service)');
    expect(schema).toContain("export function ServiceJsonLd");
    expect(schema).toContain("'@type': 'Service'");
    expect(schema).toContain("config.siteUrl + '/#organization'");
  });

  test('services UI links interactive cards to crawlable detail pages', () => {
    const page = source('src/components/pages/ServicesPage.tsx');

    expect(page).toContain("searchSlug: 'web-development'");
    expect(page).toContain("searchSlug: 'it-training'");
    expect(page).toContain("href={'/services/' + service.searchSlug}");
    expect(page).toContain("href={'/services/' + selected.searchSlug}");
    expect(page).toContain("'seo-social-media-marketing': 'growth'");
    expect(page).toContain("'skills-development': 'training'");
    expect(page).not.toContain("'skills-training': 'training'");
  });

  test('sitemap exposes each service landing page on the apex domain', () => {
    const sitemap = source('src/app/sitemap.ts');

    expect(sitemap).toContain("serviceSearchLandings");
    expect(sitemap).toContain("url: base + '/services/' + service.slug");
    expect(sitemap).toContain('priority: 0.85');
  });

  test('does not misrepresent legacy hosting as cloud and DevOps', () => {
    const content = source('src/lib/service-search-content.ts');
    const servicesPage = source('src/components/pages/ServicesPage.tsx');

    expect(content).toContain("slug: 'cloud-devops'");
    expect(content).toContain("cmsSlugs: []");
    expect(servicesPage).not.toContain("'hosting-domain': 'cloud'");
  });
});
