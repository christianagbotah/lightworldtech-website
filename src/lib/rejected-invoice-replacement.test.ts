import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('rejected invoice replacement workflow', () => {
  test('offers replacement from rejected invoice history', () => {
    const approvals = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const accounting = source('src/components/admin/FinanceAccountingWorkspace.tsx');

    expect(approvals).toContain('Prepare replacement');
    expect(approvals).toContain('onPrepareReplacement?: (invoiceId: string) => void');
    expect(approvals).toContain('onPrepareReplacement?.(invoice.id)');
    expect(accounting).toContain('onPrepareInvoiceReplacement?: (invoiceId: string) => void');
    expect(accounting).toContain('onPrepareReplacement={onPrepareInvoiceReplacement}');
  });

  test('builds a fresh draft from the rejected record instead of reopening it', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(finance).toContain('prepareRejectedInvoiceReplacement');
    expect(finance).toContain("'/api/admin/finance/records/invoice/' + encodeURIComponent(invoiceId)");
    expect(finance).toContain("invoice.status !== 'void' || !invoice.rejectedAt");
    expect(finance).toContain("status: 'draft'");
    expect(finance).toContain("issueDate,");
    expect(finance).toContain('dueDate: addDays(issueDate, organization.paymentTermsDays ?? 30)');
    expect(finance).toContain('serviceId: String(invoice.serviceId || '')');
    expect(finance).toContain('projectId: String(invoice.projectId || '')');
    expect(finance).toContain('agreementId: String(invoice.agreementId || '')');
    expect(finance).toContain('billingMilestoneId: String(invoice.billingMilestoneId || '')');
    expect(finance).toContain("description: String(line.description || '')");
    expect(finance).toContain("unitPrice: String(line.unitPrice || '')");
  });

  test('carries rejection context into the replacement review without bypassing normal save validation', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(finance).toContain('Replacement for rejected draft');
    expect(finance).toContain('Rejection reason:');
    expect(finance).toContain('Review current scope, agreement/milestone readiness, tax treatment, dates, discounts and amounts before saving.');
    expect(finance).toContain("const created = await api<Invoice>('/api/admin/finance/invoices'");
    expect(finance).toContain('onPrepareInvoiceReplacement={prepareRejectedInvoiceReplacement}');
  });

  test('keeps maker-checker and server controls on the resulting draft', () => {
    const createRoute = source('src/app/api/admin/finance/invoices/route.ts');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(createRoute).toContain('makerCheckerEnabled');
    expect(createRoute).toContain('createdByAdminId: actor.id');
    expect(createRoute).toContain('Only approved active agreements can be linked to a new invoice');
    expect(createRoute).toContain('Billing milestone must be marked ready to bill before an invoice draft can be created');
    expect(finance).toContain("status: makerCheckerEnabled ? 'draft' : invoiceForm.status");
  });
});
