import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('direct expense payment proof governance', () => {
  test('allows secure proof attachments on supported direct expense approvals', () => {
    const route = source('src/app/api/admin/finance/approvals/[id]/attachments/route.ts');

    expect(route).toContain("['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType)");
    expect(route).toContain('Upload a valid PDF, JPG, PNG or WebP payment proof');
    expect(route).toContain('Payment proof content does not match its declared type');
    expect(route).toContain("approval.status !== 'pending'");
  });

  test('blocks non-cash direct expense approval without proof', () => {
    const approvals = source('src/lib/finance-approvals.ts');

    expect(approvals).toContain("approval.outflowType === 'direct_expense_payment'");
    expect(approvals).toContain("approval.method !== 'cash' && approval.attachments.length === 0");
    expect(approvals).toContain('Payment proof is required before a non-cash direct expense payment can be approved');
  });

  test('blocks future scheduling without proof', () => {
    const route = source('src/app/api/admin/finance/approvals/[id]/route.ts');

    expect(route).toContain("['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType)");
    expect(route).toContain("approval.method !== 'cash'");
    expect(route).toContain("const label = approval.outflowType === 'vendor_payment' ? 'supplier payment' : 'direct expense payment'");
    expect(route).toContain("'Payment proof is required before a non-cash ' + label + ' can be scheduled'");
  });

  test('uses the existing proof UI and disables approval until required evidence exists', () => {
    const inbox = source('src/components/admin/FinanceOutflowApprovals.tsx');

    expect(inbox).toContain("['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType)");
    expect(inbox).toContain("proofRequired = ['vendor_payment', 'direct_expense_payment'].includes(approval.outflowType)");
    expect(inbox).toContain('accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"');
    expect(inbox).toContain("disabled={!proofReady}");
    expect(inbox).toContain('Attach payment proof before approval');
  });
});
