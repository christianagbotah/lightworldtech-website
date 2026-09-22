import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('organic authority acceleration', () => {
  test('canonical company profile keeps Google Business identity aligned', () => {
    const profile = source('src/lib/company-profile.ts');
    const schema = source('src/components/ui/json-ld.tsx');

    expect(profile).toContain("phoneDisplay: '0243618186'");
    expect(profile).toContain("'Software company'");
    expect(profile).toContain("'Computer support and services'");
    expect(profile).toContain("'IT training institute'");
    expect(schema).toContain('...companyProfile.businessCategories');
    expect(schema).toContain('companyProfile.googleMapsUrl');
  });

  test('homepage surfaces independent authority sources as crawlable links', () => {
    const home = source('src/components/pages/HomePage.tsx');

    expect(home).toContain("contentJson(settings, 'about_recognition'");
    expect(home).toContain("contentJson(settings, 'about_coverage'");
    expect(home).toContain('companyProfile.businessCategories.map');
    expect(home).toContain('companyProfile.googleMapsUrl');
    expect(home).toContain('Independent signals');
    expect(home).toContain('href="/newsroom"');
  });

  test('site publishes and advertises a canonical RSS feed', () => {
    const feed = source('src/app/feed.xml/route.ts');
    const layout = source('src/app/layout.tsx');
    const settings = source('src/components/admin/AdminSettings.tsx');

    expect(feed).toContain("seoAbsoluteUrl(seo, '/feed.xml')");
    expect(feed).toContain("where: { published: true }");
    expect(feed).toContain("'Content-Type': 'application/rss+xml; charset=utf-8'");
    expect(feed).toContain('rel="self" type="application/rss+xml"');
    expect(layout).toContain("'application/rss+xml'");
    expect(layout).toContain("new URL('/feed.xml'");
    expect(settings).toContain("['Insights RSS', canonicalSiteUrl + '/feed.xml']");

    const promotion = source('ops/promote-release.sh');
    expect(promotion).toContain('/robots.txt /feed.xml');
  });

  test('authority content does not invent review counts or ratings', () => {
    const home = source('src/components/pages/HomePage.tsx');
    const schema = source('src/components/ui/json-ld.tsx');

    expect(home).not.toContain('aggregateRating');
    expect(schema).not.toContain('aggregateRating');
  });
});
