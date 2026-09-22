import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('local search and crawl hygiene', () => {
  test('organization schema also exposes a local business entity tied to Maps', () => {
    const schema = source('src/components/ui/json-ld.tsx');

    expect(schema).toContain("'@type': ['Organization', 'LocalBusiness']");
    expect(schema).toContain('hasMap: companyProfile.googleMapsUrl');
    expect(schema).toContain('openingHoursSpecification');
    expect(schema).toContain("'Software company'");
    expect(schema).toContain("'Computer support and services'");
    expect(schema).toContain("'IT training institute'");
  });

  test('admin routes explicitly opt out of indexing', () => {
    const adminLayout = source('src/app/admin/layout.tsx');

    expect(adminLayout).toContain('robots:');
    expect(adminLayout).toContain('index: false');
    expect(adminLayout).toContain('follow: false');
    expect(adminLayout).toContain('noarchive: true');
    expect(adminLayout).toContain('nosnippet: true');
  });

  test('private UI routes use X-Robots-Tag while APIs remain robots-blocked', () => {
    const nextConfig = source('next.config.ts');
    const robots = source('src/app/robots.ts');

    expect(nextConfig).toContain("'X-Robots-Tag'");
    expect(nextConfig).toContain("'noindex, nofollow, noarchive, nosnippet'");
    expect(nextConfig).toContain("source: '/client/:path*'");
    expect(nextConfig).toContain("source: '/admin/:path*'");
    expect(robots).toContain("disallow: ['/api/']");
    expect(robots).not.toContain("'/admin'");
    expect(robots).not.toContain("'/client'");
  });

  test('www host remains permanently consolidated to the apex domain', () => {
    const nextConfig = source('next.config.ts');

    expect(nextConfig).toContain("value: 'www.lightworldtech.com'");
    expect(nextConfig).toContain("destination: 'https://lightworldtech.com/:path*'");
    expect(nextConfig).toContain('permanent: true');
  });
});
