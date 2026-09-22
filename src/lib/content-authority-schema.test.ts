import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('content authority structured data', () => {
  test('About and Contact pages connect back to the organization entity', () => {
    const schema = source('src/components/ui/json-ld.tsx');
    const about = source('src/app/about/page.tsx');
    const contact = source('src/app/contact/page.tsx');

    expect(schema).toContain('export function EntityWebPageJsonLd');
    expect(schema).toContain("'@id': config.siteUrl + '/#organization'");
    expect(about).toContain('pageType="AboutPage"');
    expect(about).toContain('<BreadcrumbJsonLd');
    expect(contact).toContain('pageType="ContactPage"');
    expect(contact).toContain('<BreadcrumbJsonLd');
  });

  test('services landing page publishes a crawlable collection of canonical service entities', () => {
    const schema = source('src/components/ui/json-ld.tsx');
    const services = source('src/app/services/page.tsx');

    expect(schema).toContain('export function ServicesCollectionJsonLd');
    expect(schema).toContain("'@type': 'ItemList'");
    expect(schema).toContain("new URL(service.path, config.siteUrl + '/').toString() + '#service'");
    expect(schema).toContain("provider: {");
    expect(services).toContain('serviceSearchLandings.map');
    expect(services).toContain('<ServicesCollectionJsonLd');
  });

  test('blog articles publish BlogPosting schema tied to the website and organization', () => {
    const schema = source('src/components/ui/json-ld.tsx');
    const article = source('src/app/blog/[slug]/page.tsx');

    expect(schema).toContain('export function BlogPostingJsonLd');
    expect(schema).toContain("'@type': 'BlogPosting'");
    expect(schema).toContain("config.siteUrl + '/#website'");
    expect(schema).toContain("config.siteUrl + '/#organization'");
    expect(schema).toContain("url + '#article'");
    expect(article).toContain('<BlogPostingJsonLd');
    expect(article).toContain('<BreadcrumbJsonLd');
    expect(article).not.toContain("const articleSchema: Record<string, unknown>");
  });

  test('content authority schema uses stable canonical IDs instead of disconnected inline organizations', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain("mainEntity:");
    expect(schema).toContain("about:");
    expect(schema).toContain("publisher: {\n      '@id': config.siteUrl + '/#organization'");
    expect(schema).toContain("isPartOf:");
  });
});
