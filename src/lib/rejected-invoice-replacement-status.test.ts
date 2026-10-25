import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('rejected invoice replacement status', () => {
  test('returns linked corrected invoice from the rejection history API', () => {
    const route = source('src/app/api/admin/finance/approvals/route.ts');

    expect(route).toContain('replacementInvoice: {');
    expect(route).toContain('invoiceNumber: true');
    expect(route).toContain('issueDate: true');
  });

  test('switches the rejected row from prepare to open once a replacement exists', () => {
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');

    expect(approvals).toContain('invoice.replacementInvoice ? (');
    expect(approvals).toContain('Open {invoice.replacementInvoice.invoiceNumber}');
    expect(approvals).toContain('onOpenInvoice?.(invoice.replacementInvoice!.id)');
    expect(approvals).toContain('Prepare replacement');
    expect(approvals).toContain('onPrepareReplacement?.(invoice.id)');
  });
});
