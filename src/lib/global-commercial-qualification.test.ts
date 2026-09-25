import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('global commercial qualification', () => {
  test('stores international opportunity context on CRM leads without rewriting the original enquiry', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260925011000_global_commercial_qualification/migration.sql');
    const contact = source('src/app/api/contact/route.ts');

    for (const field of [
      'company', 'industry', 'countryRegion', 'timezone', 'serviceInterest', 'currency',
      'budgetRange', 'deliveryWindow', 'engagementModel', 'international',
      'expectedRevenue', 'probability', 'nextAction',
    ]) {
      expect(schema).toContain(field);
      expect(migration).toContain('"' + field + '"');
    }

    expect(contact).toContain('data: {\n          name: parsed.data.name');
    expect(contact).toContain('message: parsed.data.message');
    expect(contact).toContain('countryRegion: parsed.data.countryRegion');
    expect(contact).toContain('international: isInternationalCountry(parsed.data.countryRegion)');
  });

  test('CRM APIs can filter, edit and export the global commercial fields', () => {
    const list = source('src/app/api/admin/leads/route.ts');
    const detail = source('src/app/api/admin/leads/[id]/route.ts');
    const exportRoute = source('src/app/api/admin/leads/export/route.ts');

    expect(list).toContain("searchParams.get('international')");
    expect(list).toContain("searchParams.get('industry')");
    expect(list).toContain('{ company: { contains: q } }');
    expect(list).toContain('international: all.filter((lead) => lead.international).length');

    expect(detail).toContain('expectedRevenue: z.coerce.number()');
    expect(detail).toContain('probability: z.coerce.number().int().min(0).max(100)');
    expect(detail).toContain('data.nextAction = parsed.data.nextAction');

    expect(exportRoute).toContain("'Expected Revenue'");
    expect(exportRoute).toContain("'Probability %'");
    expect(exportRoute).toContain('lead.expectedRevenue.toString()');
  });

  test('public qualification form sends structured commercial context', () => {
    const contactPage = source('src/components/pages/ContactPage.tsx');

    expect(contactPage).toContain('Company / organization');
    expect(contactPage).toContain('Industry');
    expect(contactPage).toContain('Budget range');
    expect(contactPage).toContain('Preferred currency');
    expect(contactPage).toContain('Desired delivery window');
    expect(contactPage).toContain('Engagement model');
    expect(contactPage).toContain('countryRegion: form.country.trim()');
    expect(contactPage).toContain('serviceInterest: form.service');
    expect(contactPage).toContain('message: form.message.trim()');
  });
});
