import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('executive invoice approval actions', () => {
  test('aggregates pending invoice drafts separately by currency', () => {
    const route = source('src/app/api/admin/finance/executive-actions/route.ts');

    expect(route).toContain("where: { status: 'draft' }");
    expect(route).toContain('invoiceApprovalTotals');
    expect(route).toContain('add(invoiceApprovalTotals, invoice.currency, invoice.total)');
    expect(route).toContain('invoiceApprovals: {');
    expect(route).toContain('pendingCount: invoiceDrafts.length');
    expect(route).toContain('oldestInvoiceNumber');
  });

  test('surfaces invoice approvals in the executive action centre', () => {
    const component = source('src/components/admin/FinanceExecutiveActionCenter.tsx');

    expect(component).toContain('Invoice drafts awaiting approval');
    expect(component).toContain('data.invoiceApprovals.pendingCount');
    expect(component).toContain('data.invoiceApprovals.totalsByCurrency');
    expect(component).toContain('data.invoiceApprovals.oldestCreatedAt');
    expect(component).toContain('Review invoice approvals');
    expect(component).toContain('onClick={onApprovals}');
  });
});
