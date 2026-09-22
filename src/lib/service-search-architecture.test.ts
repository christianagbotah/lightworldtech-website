import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serviceSearchPages } from './service-search-pages';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('service search architecture', () => {
  test('publishes a focused set of substantial service pages', () => {
    expect(serviceSearchPages).toHaveLength(8);
    expect(new Set(serviceSearchPages.map((item) => item.slug)).size).toBe(8);
    expect(new Set(serviceSearchPages.map((item) => item.metaTitle)).size).toBe(8);
    expect(new Set(serviceSearchPages.map((item) => item.metaDescription)).size).toBe(8);

    for (const page of serviceSearchPages) {
      expect(page.slug).toMatch(/^[a-z0-9-]+$/);
      expect(page.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(page.deliverables.length).toBeGreaterThanOrEqual(6);
      expect(page.outcomes.length).toBeGreaterThanOrEqual(4);
      expect(page.idealFor.length).toBeGreaterThanOrEqual(4);
      expect(page.related.length).toBeGreaterThanOrEqual(3);
      expect(page.summary.length).toBeGreaterThan(80);
      expect(page.metaDescription.length).toBeGreaterThan(100);
    }
  });

  test('uses canonical metadata, Service schema and breadcrumbs', () => {
    const route = source('src/app/services/[slug]/page.tsx');

    expect(route).toContain("path: '/services/' + service.slug");
    expect(route).toContain('absoluteTitle: true');
    expect(route).toContain("'@type': 'Service'");
    expect(route).toContain('BreadcrumbJsonLd');
    expect(route).toContain("seo.siteUrl + '/#organization'");
    expect(route).toContain("'Greater Accra Region'");
  });

  test('connects every service page into the crawl graph and sitemap', () => {
    const services = source('src/components/pages/ServicesPage.tsx');
    const sitemap = source('src/app/sitemap.ts');

    for (const page of serviceSearchPages) {
      expect(services).toContain('/services/' + page.slug);
    }

    expect(sitemap).toContain("import { serviceSearchPages }");
    expect(sitemap).toContain("base + '/services/' + service.slug");
    expect(sitemap).toContain('priority: 0.85');
  });

  test('maps current and legacy CMS slugs into the intended flagship capability cards', () => {
    const services = source('src/components/pages/ServicesPage.tsx');

    expect(services).toContain("'seo-social-media-marketing': 'growth'");
    expect(services).toContain("'skills-development': 'training'");
    expect(services).toContain("'hosting-domain': 'cloud'");
  });

  test('refreshes only untouched legacy service records and removes stale positioning', () => {
    const migration = source('prisma/migrations/20260922013000_service_search_content_refresh/migration.sql');
    const seed = source('prisma/seed.ts');

    expect(migration).toContain("WHERE \"id\" = 'svc-skills-dev'");
    expect(migration).toContain("AND \"title\" = 'Skills Development'");
    expect(migration).toContain("WHERE \"id\" = 'svc-hosting'");
    expect(migration).toContain("AND \"description\" LIKE 'We provide reliable web hosting%'");
    expect(seed).toContain("title: 'IT Training & Consultancy'");
    expect(seed).toContain("title: 'SEO & Digital Growth'");
    expect(seed).toContain("title: 'Cloud Hosting & Infrastructure'");
    expect(seed).not.toContain('Beads & Crafts Design Training');
    expect(seed).not.toContain('99.9% uptime guarantee');
  });
});
