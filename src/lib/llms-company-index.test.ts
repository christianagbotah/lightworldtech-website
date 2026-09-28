import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('governed llms company index', () => {
  test('builds machine-readable company facts from governed sources', () => {
    const route = source('src/app/llms.txt/route.ts');

    expect(route).toContain('companyProfile');
    expect(route).toContain('getSiteSettings');
    expect(route).toContain('getActiveTeamMembers');
    expect(route).toContain("contentText(settings, 'company_name'");
    expect(route).toContain("contentJson(settings, 'about_recognition'");
    expect(route).toContain('isSafePublicSourceUrl');
  });

  test('surfaces canonical discovery, trust, media and conversion routes', () => {
    const route = source('src/app/llms.txt/route.ts');

    expect(route).toContain("absolute('/media-kit')");
    expect(route).toContain("absolute('/trust')");
    expect(route).toContain("absolute('/estimate')");
    expect(route).toContain("absolute('/contact')");
    expect(route).toContain("absolute('/sitemap.xml')");
    expect(route).toContain("absolute('/robots.txt')");
    expect(route).toContain("absolute('/llms.txt')");
  });

  test('keeps commercial claims explicitly non-binding and publisher-linked', () => {
    const route = source('src/app/llms.txt/route.ts');

    expect(route).toContain('does not create project, pricing, delivery or contractual commitments');
    expect(route).toContain('Award and coverage claims should retain their linked publisher source');
    expect(route).toContain('require a written Lightworld proposal or agreement');
  });

  test('serves plain text with bounded public caching', () => {
    const route = source('src/app/llms.txt/route.ts');

    expect(route).toContain("'Content-Type': 'text/plain; charset=utf-8'");
    expect(route).toContain("'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'");
    expect(route).toContain("'X-Robots-Tag': 'index, follow'");
  });
});
