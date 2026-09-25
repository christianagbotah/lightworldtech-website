import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('evidence-governed case studies', () => {
  test('requires approval evidence before a case study can be published', () => {
    const schema = source('prisma/schema.prisma');
    const create = source('src/app/api/portfolio/route.ts');
    const update = source('src/app/api/portfolio/[id]/route.ts');

    for (const field of ['caseStudyPublished', 'caseStudySlug', 'caseStudyChallenge', 'caseStudySolution', 'caseStudyOutcomes', 'caseStudyApprovalReference']) {
      expect(schema).toContain(field);
    }
    expect(create).toContain('Publishing a case study requires a slug, challenge, solution, outcomes and internal approval reference.');
    expect(update).toContain('Publishing a case study requires a slug, challenge, solution, outcomes and internal approval reference.');
  });

  test('public case-study routes select only published active records and never render the approval reference', () => {
    const index = source('src/app/case-studies/page.tsx');
    const detail = source('src/app/case-studies/[slug]/page.tsx');

    expect(index).toContain('caseStudyPublished: true');
    expect(index).toContain('active: true');
    expect(detail).toContain('caseStudyPublished: true');
    expect(detail).toContain('active: true');
    expect(detail).not.toContain('caseStudyApprovalReference: true');
    expect(detail).toContain('Internal approval references are retained privately');
  });

  test('admin portfolio makes publication governance explicit', () => {
    const admin = source('src/components/admin/AdminPortfolio.tsx');
    expect(admin).toContain('Evidence-governed case study');
    expect(admin).toContain('Internal approval reference');
    expect(admin).toContain('never shown publicly');
  });

  test('sitemap and authority surfaces link approved case studies', () => {
    const sitemap = source('src/app/sitemap.ts');
    const portfolio = source('src/components/pages/PortfolioPage.tsx');
    const global = source('src/components/pages/GlobalPage.tsx');
    const assistant = source('src/lib/assistant-knowledge.ts');

    expect(sitemap).toContain("base + '/case-studies'");
    expect(sitemap).toContain("base + '/case-studies/' + item.caseStudySlug");
    expect(portfolio).toContain('View approved case studies');
    expect(global).toContain('Approved case studies');
    expect(assistant).toContain("href: '/case-studies'");
  });
});
