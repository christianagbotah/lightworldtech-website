import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('customer receipt maker-checker governance', () => {
  test('adds a dedicated inbound approval record and sequence', () => {
    const schema = source('prisma/schema.prisma');
    const finance = source('src/lib/finance.ts');
    const migration = source('prisma/migrations/20260928221000_customer_receipt_maker_checker/migration.sql');

    expect(schema).toContain('model FinanceReceiptApproval');
    expect(schema).toContain('receiptApprovals   FinanceReceiptApproval[]');
    expect(schema).toContain('resultReceiptNumber String');
    expect(finance).toContain("'finance_receipt_approval_number_seq'");
    expect(finance).toContain("formatNumber('RAP'");
    expect(migration).toContain('CREATE SEQUENCE IF NOT EXISTS "finance_receipt_approval_number_seq"');
    expect(migration).toContain('CREATE TABLE "FinanceReceiptApproval"');
  });

  test('queues manual receipts without posting cash when maker-checker is enabled', () => {
    const route = source('src/app/api/admin/finance/payments/route.ts');

    expect(route).toContain('getFinanceApprovalPolicy()');
    expect(route).toContain('policy?.enabled && policy.requireSecondApprover');
    expect(route).toContain('createReceiptApproval(actor, input)');
    expect(route).toContain('pendingApproval: true');
    expect(route).toContain('{ status: 202 }');
    expect(route.indexOf('createReceiptApproval(actor, input)')).toBeLessThan(route.indexOf('postManualCustomerReceipt(actor, input)'));
  });

  test('revalidates and serializes receipt posting under transaction locks', () => {
    const helper = source('src/lib/finance-receipt-approvals.ts');

    expect(helper).toContain('pg_advisory_xact_lock');
    expect(helper).toContain("'lightworld-customer-receipt:' + invoiceId");
    expect(helper).toContain('Receipt and invoice currencies must match');
    expect(helper).toContain('Allocation exceeds the outstanding balance');
    expect(helper).toContain("source: 'manual'");
    expect(helper).toContain('postCustomerPaymentJournal');
    expect(helper).toContain('notifyCustomerPaymentReceived(payment.id)');
  });

  test('atomically claims a pending request and blocks maker self-approval', () => {
    const helper = source('src/lib/finance-receipt-approvals.ts');
    const route = source('src/app/api/admin/finance/receipt-approvals/[id]/route.ts');

    expect(helper).toContain('Maker-checker prevents the requester from approving their own receipt');
    expect(helper).toContain("where: { id: approval.id, status: 'pending' }");
    expect(helper).toContain("data: { status: 'processing' }");
    expect(helper).toContain("where: { id: approval.id, status: 'processing' }");
    expect(helper).toContain("data: { status: 'pending' }");
    expect(route).toContain('Maker-checker prevents you from deciding your own receipt request');
    expect(route).toContain('admin.finance_customer_receipt_approval_approved');
    expect(route).toContain('admin.finance_customer_payment_recorded');
  });

  test('surfaces receipt approvals and correct maker UX in Finance', () => {
    const inboxApi = source('src/app/api/admin/finance/approvals/route.ts');
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(inboxApi).toContain('receiptApprovals: receiptApprovals.map(serializeReceiptApproval)');
    expect(approvals).toContain('Pending customer receipt approvals');
    expect(approvals).toContain('Customer receipt approval history');
    expect(approvals).toContain('/api/admin/finance/receipt-approvals/');
    expect(finance).toContain('Customer receipt submitted for approval');
    expect(finance).toContain('result?.pendingApproval');
  });

  test('surfaces actionable receipt approvals through the admin notification centre', () => {
    const notices = source('src/app/api/admin/notifications/route.ts');

    expect(notices).toContain("key: 'finance.approve'");
    expect(notices).toContain('requestedByAdminId: { not: admin.id }');
    expect(notices).toContain("status: 'pending'");
    expect(notices).toContain('24 * 60 * 60 * 1000');
    expect(notices).toContain('48 * 60 * 60 * 1000');
    expect(notices).toContain("id: 'finance-receipt-approvals'");
    expect(notices).toContain("id: 'finance-receipt-approvals-aging'");
    expect(notices).toContain("id: 'finance-receipt-approvals-overdue'");
    expect(notices).toContain("action: 'admin-finance-approvals'");
  });
});
