import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement to finance billing handoff', () => {
  test('offers billing preparation only for approved active agreements', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain("agreement.status === 'active' && agreement.approvalStatus === 'approved'");
    expect(clients).toContain('Prepare billing');
    expect(clients).toContain("sessionStorage.setItem('lw-finance-action', 'agreement-invoice')");
    expect(clients).toContain("sessionStorage.setItem('lw-finance-agreement-context'");
    expect(clients).toContain("toast.error('Only approved active agreements can prepare billing')");
  });

  test('opens finance as a human-reviewed draft with agreement context prefilled', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(finance).toContain("deepLinkAction === 'agreement-invoice'");
    expect(finance).toContain("status: 'draft'");
    expect(finance).toContain('organization.paymentTermsDays');
    expect(finance).toContain("projectId: deepLinkAgreementBilling.projectId || ''");
    expect(finance).toContain("currency: deepLinkAgreementBilling.currency || 'GHS'");
    expect(finance).toContain('contractValue > 0 ? String(contractValue) :');
    expect(finance).toContain('Contract value is prefilled as commercial context only');
    expect(finance).toContain('Review invoice lines, tax treatment, dates, discounts and amount before issuing');
  });
});
