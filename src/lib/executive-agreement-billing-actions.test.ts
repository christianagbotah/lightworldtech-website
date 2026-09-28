import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('executive agreement billing actions', () => {
  test('derives non-overlapping agreement billing exceptions for executives', () => {
    const route = source('src/app/api/admin/finance/executive-actions/route.ts');

    expect(route).toContain("status: 'active'");
    expect(route).toContain("approvalStatus: 'approved'");
    expect(route).toContain('agreementOverbilledCount');
    expect(route).toContain('agreementDraftPendingCount');
    expect(route).toContain('agreementUnpreparedCount');
    expect(route).toContain('remainingByCurrency');
    expect(route).toContain('draftByCurrency');
    expect(route).toContain('overbilledByCurrency');
    expect(route).toContain('continue;');
  });

  test('shows a management action card and opens the governed billing control', () => {
    const actionCenter = source('src/components/admin/FinanceExecutiveActionCenter.tsx');
    const dashboard = source('src/components/admin/FinanceExecutiveDashboard.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');
    const control = source('src/components/admin/FinanceAgreementBillingControl.tsx');

    expect(actionCenter).toContain('Billing exceptions');
    expect(actionCenter).toContain('Open agreement billing');
    expect(actionCenter).toContain('agreementBilling.attentionCount');
    expect(dashboard).toContain('onAgreementBilling={onAgreementBilling}');
    expect(finance).toContain("document.getElementById('agreement-billing-control')");
    expect(finance).toContain("setSection('customers')");
    expect(control).toContain('id="agreement-billing-control"');
  });
});
