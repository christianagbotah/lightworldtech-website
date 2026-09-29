import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('supplier bill maker-checker governance', () => {
  test('stores maker/checker lifecycle fields and migration', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928235500_supplier_bill_maker_checker/migration.sql');

    expect(schema).toContain('createdByAdminId String');
    expect(schema).toContain('approvedByAdminId String');
    expect(schema).toContain('rejectedByAdminId String');
    expect(schema).toContain('rejectionReason String');
    expect(migration).toContain('ALTER TABLE "FinanceVendorBill"');
    expect(migration).toContain('"approvedAt" TIMESTAMP(3)');
  });

  test('creates a draft without posting the supplier bill journal when maker-checker is enabled', () => {
    const route = source('src/app/api/admin/finance/bills/route.ts');

    expect(route).toContain('makerCheckerRequired');
    expect(route).toContain("const initialStatus = makerCheckerRequired ? 'draft' : 'unpaid'");
    expect(route).toContain('createdByAdminId: actor.id');
    expect(route).toContain('if (!makerCheckerRequired)');
    expect(route).toContain('postVendorBillJournal');
    expect(route).toContain('admin.finance_supplier_bill_draft_created');
  });

  test('requires a different approver and supplier invoice evidence before posting', () => {
    const route = source('src/app/api/admin/finance/bills/[id]/post/route.ts');

    expect(route).toContain("finance.approve");
    expect(route).toContain('bill.createdByAdminId === actor.id');
    expect(route).toContain('Maker-checker prevents the supplier bill preparer from posting their own draft');
    expect(route).toContain('Supplier invoice evidence must be attached before this draft can be posted');
    expect(route).toContain('postVendorBillJournal');
    expect(route).toContain("status: 'unpaid'");
    expect(route).toContain('approvedByAdminId: actor.id');
  });

  test('rejection is terminal without posting a payable', () => {
    const route = source('src/app/api/admin/finance/bills/[id]/reject/route.ts');

    expect(route).toContain("status: 'rejected'");
    expect(route).toContain('rejectedByAdminId: actor.id');
    expect(route).toContain('rejectionReason: parsed.data.reason');
    expect(route).not.toContain('postVendorBillJournal');
  });

  test('unposted bills are excluded from cash, treasury, tax, close and dashboard workflows', () => {
    const vendorPayments = source('src/app/api/admin/finance/vendor-payments/route.ts');
    const outflows = source('src/lib/finance-approvals.ts');
    const treasury = source('src/app/api/admin/finance/treasury-runs/route.ts');
    const tax = source('src/app/api/admin/finance/accounting/tax/report/route.ts');
    const close = source('src/lib/finance-close.ts');
    const dashboard = source('src/app/api/admin/finance/dashboard/route.ts');

    expect(vendorPayments).toContain("['draft', 'rejected', 'void'].includes(bill.status)");
    expect(outflows).toContain("['draft', 'rejected', 'void'].includes(bill.status)");
    expect(treasury).toContain("['draft', 'rejected', 'paid', 'void']");
    expect(tax).toContain("status: { notIn: ['draft', 'rejected', 'void'] }");
    expect(close).toContain("status: { notIn: ['draft', 'rejected', 'void'] }");
    expect(dashboard).toContain("status: { notIn: ['draft', 'rejected', 'void'] }");
  });

  test('surfaces supplier bill drafts in the approval inbox and blocks payment UI until posted', () => {
    const approvalsApi = source('src/app/api/admin/finance/approvals/route.ts');
    const approvalsUi = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(approvalsApi).toContain('supplierBillDrafts');
    expect(approvalsApi).toContain('evidenceAttached');
    expect(approvalsUi).toContain('Pending supplier bill approvals');
    expect(approvalsUi).toContain('Supplier invoice evidence is required before posting');
    expect(approvalsUi).toContain('/api/admin/finance/bills/');
    expect(finance).toContain("!['draft', 'rejected', 'void', 'paid'].includes(bill.derivedStatus)");
    expect(details).toContain("!['draft', 'rejected', 'void'].includes(data.bill.derivedStatus)");
    expect(details).toContain('Awaiting payable approval');
  });
});
