import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('global opportunity intelligence', () => {
  test('keeps pipeline values separated by currency and probability-weights each opportunity', () => {
    const route = source('src/app/api/admin/leads/route.ts');
    expect(route).toContain("const currency = lead.currency.trim().toUpperCase() || 'UNSPECIFIED'");
    expect(route).toContain('pipeline.get(currency)');
    expect(route).toContain('current.expectedRevenue += amount');
    expect(route).toContain('current.weightedRevenue += amount * Math.max(0, Math.min(100, lead.probability)) / 100');
    expect(route).not.toContain('totalExpectedRevenue');
    expect(route).not.toContain('totalWeightedRevenue');
  });

  test('surfaces market, industry and next-action coverage in CRM', () => {
    const route = source('src/app/api/admin/leads/route.ts');
    const crm = source('src/components/admin/AdminCRM.tsx');

    expect(route).toContain('internationalOpen');
    expect(route).toContain('domesticOpen');
    expect(route).toContain('actionGaps');
    expect(route).toContain('countries: countBy');
    expect(route).toContain('industries: countBy');

    expect(crm).toContain('Weighted pipeline by currency');
    expect(crm).toContain('Expected values stay separated by currency');
    expect(crm).toContain('Open opportunity intelligence');
    expect(crm).toContain('Top countries / regions');
    expect(crm).toContain('Top industries');
    expect(crm).toContain('Action gaps');
  });
});
