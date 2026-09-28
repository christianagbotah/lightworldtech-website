import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('governed draft invoice issuance', () => {
  test('serializes invoice lifecycle changes and keeps void invoices terminal', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('lightworld-invoice-lifecycle:');
    expect(route).toContain('pg_advisory_xact_lock');
    expect(route).toContain('A void invoice is terminal and cannot be reactivated');
    expect(route).toContain('An issued invoice cannot be returned to draft');
  });

  test('revalidates customer credit controls before issuing a saved draft', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('Customer account is on credit hold');
    expect(route).toContain('lightworld-credit-control:');
    expect(route).toContain('Issuing this draft would exceed the customer credit limit');
    expect(route).toContain('invoiceBalance(row.total, row.allocations, row.creditNotes)');
  });

  test('revalidates agreement entitlement and prevents contract overbilling', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('The linked agreement is no longer approved and active');
    expect(route).toContain('Invoice currency no longer matches the linked agreement currency');
    expect(route).toContain('Invoice project no longer matches the linked agreement project');
    expect(route).toContain('projectedAgreementBilling.gt(invoice.agreement.contractValue)');
    expect(route).toContain('Issuing this draft would exceed the linked agreement contract value');
    expect(route).toContain("basis === 'tax_exclusive' ? invoice.taxableAmount : invoice.total");
  });

  test('revalidates billing milestone readiness, uniqueness and exact commercial value', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("invoice.billingMilestone.readinessStatus !== 'ready_to_bill'");
    expect(route).toContain('Billing milestone is no longer ready to bill');
    expect(route).toContain('Another non-void invoice is already linked to this billing milestone');
    expect(route).toContain('!currentComparable.eq(invoice.billingMilestone.amount)');
    expect(route).toContain('Draft value no longer matches the approved billing milestone amount');
  });

  test('blocks stale statutory tax configuration before ledger posting', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("invoice.taxTreatment === 'standard'");
    expect(route).toContain('Standard Ghana VAT is disabled. Review the draft before issuing.');
    expect(route).toContain('The statutory tax profile has changed since this draft was prepared');
    expect(route).toContain('postInvoiceJournal');
  });

  test('audits both successful and blocked draft issuance', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('admin.finance_invoice_issue_blocked');
    expect(route).toContain('admin.finance_invoice_issue_credit_blocked');
    expect(route).toContain('admin.finance_invoice_issued_from_draft');
    expect(route).toContain('fromStatus: existing.status');
    expect(route).toContain('toStatus: updated.status');
  });

  test('gives Finance an explicit confirmation-based issue action on the saved draft', () => {
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(details).toContain('Issue reviewed draft');
    expect(details).toContain('Issue this reviewed draft?');
    expect(details).toContain("body: JSON.stringify({ status: 'issued' })");
    expect(details).toContain('revalidates customer credit controls');
    expect(details).toContain('ConfirmActionDialog');
    expect(details).toContain('Draft invoice issued and posted to the ledger');
  });
});
