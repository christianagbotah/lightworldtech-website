import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('search prominence and client advocacy', () => {
  test('homepage visible copy reinforces exact entity, location and business category', () => {
    const home = source('src/components/pages/HomePage.tsx');
    const cms = source('src/lib/site-content.ts');

    for (const content of [home, cms]) {
      expect(content).toContain('Lightworld Technologies Limited · Tema, Ghana');
      expect(content).toContain('Software, AI and digital systems built for real business.');
      expect(content).toContain('Ghanaian software company and IT training institute');
      expect(content).toContain('Based in Tema, Greater Accra, Lightworld Technologies Limited');
    }
  });

  test('homepage migration only creates missing fields and does not overwrite CMS edits', () => {
    const migration = source('prisma/migrations/20260922103000_search_prominence_client_advocacy/migration.sql');

    expect(migration).toContain('WHERE NOT EXISTS');
    expect(migration).toContain("'home_eyebrow'");
    expect(migration).toContain("'home_title'");
    expect(migration).toContain("'home_description'");
    expect(migration).toContain("'home_entity_summary'");
    expect(migration).not.toContain('UPDATE "SiteSetting"');
  });

  test('leadership people are connected to the organization entity graph', () => {
    const schema = source('src/components/ui/json-ld.tsx');
    const team = source('src/app/team/page.tsx');

    expect(schema).toContain('export function LeadershipJsonLd');
    expect(schema).toContain("'@type': 'Person'");
    expect(schema).toContain("worksFor:");
    expect(schema).toContain("config.siteUrl + '/#organization'");
    expect(schema).toContain('employee: companyProfile.leadership.map');
    expect(team).toContain('<LeadershipJsonLd config={seo} />');
    expect(team).toContain('<BreadcrumbJsonLd');
  });

  test('authenticated clients can reach the verified Google review flow without review gating', () => {
    const profile = source('src/lib/company-profile.ts');
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(profile).toContain('https://search.google.com/local/writereview?placeid=ChIJl7EfYil_3w8R126pXLqlMgw');
    expect(profile).toContain("googleReviewPath: '/review'");
    expect(portal).toContain('href={companyProfile.googleReviewPath}');
    expect(portal).toContain('leave an honest Google review');
    expect(portal).toContain('never exchanged for discounts or incentives');
    expect(portal).not.toContain('clientRating >= 4');
    expect(portal).not.toContain('clientRating === 5');
  });
});
