import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('invoice maker-checker governance', () => {
  test('stores durable invoice maker and issuer identities', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928170500_invoice_maker_checker/migration.sql');

    expect(schema).toContain('createdByAdminId String');
    expect(schema).toContain('issuedByAdminId String');
    expect(schema).toContain('issuedBy       String');
    expect(schema).toContain('issuedAt       DateTime?');
    expect(migration).toContain('ADD COLUMN "createdByAdminId"');
    expect(migration).toContain('ADD COLUMN "issuedByAdminId"');
    expect(migration).toContain('ADD COLUMN "issuedAt"');
  });

  test('forces new invoices to draft when finance maker-checker is enabled', () => {
    const route = source('src/app/api/admin/finance/invoices/route.ts');

    expect(route).toContain('getFinanceApprovalPolicy');
    expect(route).toContain('makerCheckerEnabled');
    expect(route).toContain("const effectiveStatus: 'draft' | 'issued' = makerCheckerEnabled ? 'draft' : parsed.data.status");
    expect(route).toContain('createdByAdminId: actor.id');
    expect(route).toContain("effectiveStatus === 'issued'");
    expect(route).toContain('issuedByAdminId: actor.id');
  });

  test('requires a different finance approver before draft issuance', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("hasAdminPermission(actor.role, actor.permissions, 'finance.approve')");
    expect(route).toContain('Finance approval permission is required to issue this draft');
    expect(route).toContain('invoice.createdByAdminId === actor.id');
    expect(route).toContain('Maker-checker prevents the invoice preparer from issuing their own draft');
    expect(route).toContain('legacy draft has no recorded maker identity');
    expect(route).toContain('issuedByAdminId: actor.id');
    expect(route).toContain('issuedAt: new Date()');
  });

  test('keeps the staff UX explicit about governed draft behavior', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');
    const permissions = source('src/lib/admin-permissions.ts');

    expect(finance).toContain('Finance maker-checker is active');
    expect(finance).toContain("status: makerCheckerEnabled ? 'draft' : invoiceForm.status");
    expect(finance).toContain('A different finance approver must review and issue it');
    expect(approvals).toContain('Finance maker-checker approval');
    expect(approvals).toContain('invoice drafts require a different authorized approver before issuance');
    expect(details).toContain('label="Prepared by"');
    expect(details).toContain('label="Issued by"');
    expect(details).toContain('label="Issued at"');
    expect(permissions).toContain('Approve governed invoice issuance');
  });
});
