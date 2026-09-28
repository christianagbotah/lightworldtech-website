import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement contract value basis', () => {
  test('persists a governed tax basis on agreements with a safe legacy default', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928153000_agreement_contract_value_basis/migration.sql');
    const createRoute = source('src/app/api/admin/clients/[id]/agreements/route.ts');
    const updateRoute = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(schema).toContain('contractValueBasis String');
    expect(schema).toContain('@default("unspecified")');
    expect(migration).toContain("CHECK (\"contractValueBasis\" IN ('unspecified', 'tax_exclusive', 'tax_inclusive'))");
    expect(createRoute).toContain("z.enum(['unspecified', 'tax_exclusive', 'tax_inclusive'])");
    expect(createRoute).toContain('contractValueBasis: parsed.data.contractValueBasis');
    expect(updateRoute).toContain("contractValueBasis: z.enum(['unspecified', 'tax_exclusive', 'tax_inclusive']).optional()");
    expect(updateRoute).toContain('contractValueBasis: agreement.contractValueBasis');
  });

  test('lets staff classify both new and existing agreements', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain("contractValueBasis: 'unspecified'");
    expect(clients).toContain('Contract value basis');
    expect(clients).toContain('Tax-exclusive / before tax');
    expect(clients).toContain('Tax-inclusive / final invoice total');
    expect(clients).toContain("patchAgreement(agreement.id, { contractValueBasis: e.target.value })");
    expect(clients).toContain('Value basis:');
  });

  test('uses taxable value for tax-exclusive agreements and invoice total for tax-inclusive agreements', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(route).toContain("agreement.contractValueBasis === 'tax_exclusive' ? invoice.taxableAmount : invoice.total");
    expect(route).toContain('basisUnspecified: agreement.contractValueBasis');
    expect(route).toContain('Tax-exclusive agreements are compared with invoice taxable value before tax');
    expect(route).toContain('tax-inclusive agreements are compared with final invoice totals');
  });

  test('treats unspecified basis as an executive control issue without double-counting', () => {
    const route = source('src/app/api/admin/finance/executive-actions/route.ts');
    const actionCenter = source('src/components/admin/FinanceExecutiveActionCenter.tsx');

    expect(route).toContain('agreementBasisUnspecifiedCount');
    expect(route).toContain('agreementAttentionIds.add(agreement.id)');
    expect(route).toContain('attentionCount: agreementAttentionIds.size');
    expect(route).toContain('basisUnspecifiedCount: agreementBasisUnspecifiedCount');
    expect(actionCenter).toContain("basisUnspecifiedCount + ' basis review'");
  });

  test('carries basis guidance into billing preparation and permanent invoice audit detail', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');
    const detailsRoute = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(finance).toContain("contractValueBasis: 'unspecified' | 'tax_exclusive' | 'tax_inclusive'");
    expect(finance).toContain("Agreement value is tax-exclusive");
    expect(finance).toContain("Agreement value is tax-inclusive");
    expect(finance).toContain('Agreement value basis is unspecified');
    expect(detailsRoute).toContain('contractValueBasis: true');
    expect(details).toContain('Agreement value basis');
  });
});
