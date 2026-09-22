import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('reputation and search authority workflow', () => {
  test('exposes a stable first-party review URL that redirects to the verified Google Place review flow', () => {
    const profile = source('src/lib/company-profile.ts');
    const route = source('src/app/review/route.ts');

    expect(profile).toContain("googleReviewPath: '/review'");
    expect(profile).toContain('https://search.google.com/local/writereview?placeid=ChIJl7EfYil_3w8R126pXLqlMgw');
    expect(route).toContain('NextResponse.redirect(companyProfile.googleReviewUrl, 307)');
    expect(route).toContain("'X-Robots-Tag'");
    expect(route).toContain('noindex, nofollow, noarchive, nosnippet');
  });

  test('client portal uses the first-party review path and keeps the request neutral', () => {
    const portal = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('href={companyProfile.googleReviewPath}');
    expect(portal).toContain('leave an honest Google review');
    expect(portal).toContain('never exchanged for discounts or incentives');
    expect(portal).not.toContain('clientRating >= 4');
    expect(portal).not.toContain('clientRating === 5');
  });

  test('seeds a system review-request SMS template without incentives or review gating', () => {
    const migration = source('prisma/migrations/20260922110000_reputation_search_authority/migration.sql');

    expect(migration).toContain("'google_review_request'");
    expect(migration).toContain("'reputation'");
    expect(migration).toContain('https://lightworldtech.com/review');
    expect(migration).toContain('Reviews are optional');
    expect(migration).toContain('true,true');
    expect(migration.toLowerCase()).not.toContain('5-star');
    expect(migration.toLowerCase()).not.toContain('discount');
    expect(migration.toLowerCase()).not.toContain('reward');
  });

  test('admin SMS workflow warns staff not to gate or incentivize reviews', () => {
    const sms = source('src/components/admin/AdminSms.tsx');

    expect(sms).toContain("selectedCampaignTemplate?.key === 'google_review_request'");
    expect(sms).toContain('Send this only to genuine clients');
    expect(sms).toContain('never offer incentives');
    expect(sms).toContain('filter recipients by satisfaction rating');
  });
});
