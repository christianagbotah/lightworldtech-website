import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('invoice approval inbox', () => {
  test('surfaces saved draft invoices with maker and commercial context', () => {
    const route = source('src/app/api/admin/finance/approvals/route.ts');

    expect(route).toContain("where: { status: 'draft' }");
    expect(route).toContain('createdByAdminId: true');
    expect(route).toContain('createdBy: true');
    expect(route).toContain('billingMilestone: { select:');
    expect(route).toContain('agreement: { select:');
    expect(route).toContain('invoiceDrafts: invoiceDrafts.map');
    expect(route).toContain('makerCanIssue:');
  });

  test('gives approvers a dedicated review queue and preserves maker-checker visibility', () => {
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');

    expect(approvals).toContain('Pending invoice approvals');
    expect(approvals).toContain('Prepared by you');
    expect(approvals).toContain('A different approver must issue this draft.');
    expect(approvals).toContain('Finance Approvals permission required to issue.');
    expect(approvals).toContain('Review invoice');
    expect(approvals).toContain('onOpenInvoice?.(invoice.id)');
  });

  test('routes invoice review into the existing governed invoice detail flow', () => {
    const accounting = source('src/components/admin/FinanceAccountingWorkspace.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(accounting).toContain('onOpenInvoice?: (invoiceId: string) => void');
    expect(accounting).toContain('<FinanceOutflowApprovals onOpenInvoice={onOpenInvoice} />');
    expect(finance).toContain("onOpenInvoice={(invoiceId) => openFinanceRecord('invoice', invoiceId)}");
  });
});
