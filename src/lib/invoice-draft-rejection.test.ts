import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('invoice draft rejection governance', () => {
  test('stores durable rejection identity, time and reason', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928182500_invoice_draft_rejection/migration.sql');

    expect(schema).toContain('rejectedByAdminId String');
    expect(schema).toContain('rejectedBy     String');
    expect(schema).toContain('rejectedAt     DateTime?');
    expect(schema).toContain('rejectionReason String');
    expect(migration).toContain('ADD COLUMN "rejectedByAdminId"');
    expect(migration).toContain('ADD COLUMN "rejectedAt"');
    expect(migration).toContain('ADD COLUMN "rejectionReason"');
  });

  test('requires an authorized second-person finance decision and a reason', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/reject/route.ts');

    expect(route).toContain("'finance.approve'");
    expect(route).toContain("reason: z.string().trim().min(3).max(4000)");
    expect(route).toContain("invoice.status !== 'draft'");
    expect(route).toContain('Maker-checker prevents the invoice preparer from rejecting their own draft');
    expect(route).toContain("status: 'void'");
    expect(route).toContain('rejectedByAdminId: actor.id');
    expect(route).toContain('rejectionReason: parsed.data.reason');
    expect(route).toContain("action: 'admin.finance_invoice_draft_rejected'");
    expect(route).toContain('replacementAllowed: true');
  });

  test('lets approvers reject from the invoice approval inbox without weakening issuance review', () => {
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');

    expect(approvals).toContain('Reject draft');
    expect(approvals).toContain('Reason for rejection');
    expect(approvals).toContain("'/api/admin/finance/invoices/' + encodeURIComponent(invoiceReject.id) + '/reject'");
    expect(approvals).toContain("const canReject = Boolean(inbox?.canApprove) && (!policy?.enabled || !mine)");
    expect(approvals).toContain('The draft will be voided and cannot be issued later');
    expect(approvals).toContain('makes that milestone eligible for a corrected replacement');
  });

  test('shows the rejection trail on invoice details', () => {
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(details).toContain('label="Rejected by"');
    expect(details).toContain('label="Rejected at"');
    expect(details).toContain('Draft rejected');
    expect(details).toContain('data.invoice.rejectionReason');
  });

  test('keeps rejected drafts visible in approval history and notifies the original maker', () => {
    const approvalsRoute = source('src/app/api/admin/finance/approvals/route.ts');
    const approvalsUi = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const notifications = source('src/app/api/admin/notifications/route.ts');

    expect(approvalsRoute).toContain('rejectedInvoiceDrafts');
    expect(approvalsRoute).toContain("status: 'void'");
    expect(approvalsRoute).toContain('rejectedAt: { not: null }');
    expect(approvalsUi).toContain('Rejected invoice drafts');
    expect(approvalsUi).toContain('lightworld-rejected-invoice-drafts');
    expect(approvalsUi).toContain('invoice.rejectionReason');
    expect(notifications).toContain("'finance-my-rejected-invoice-drafts'");
    expect(notifications).toContain('createdByAdminId: admin.id');
    expect(notifications).toContain("action: 'admin-finance-approvals'");
  });

  test('existing agreement billing control ignores rejected void drafts so replacements remain possible', () => {
    const billing = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(billing).toContain("where: { status: { not: 'void' } }");
    expect(billing).toContain('milestone.invoices.length === 0');
  });
});
