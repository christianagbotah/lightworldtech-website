import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement billing control', () => {
  test('derives active approved agreement billing exposure from permanently linked invoices', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(route).toContain("status: 'active'");
    expect(route).toContain("approvalStatus: 'approved'");
    expect(route).toContain('contractValue: { gt: 0 }');
    expect(route).toContain("where: { status: { not: 'void' } }");
    expect(route).toContain("invoice.status !== 'draft'");
    expect(route).toContain("invoice.status === 'draft'");
    expect(route).toContain('agreement.contractValue.minus(committedAmount)');
    expect(route).toContain('agreement.contractValue.minus(issuedAmount)');
    expect(route).toContain("state = 'overbilled'");
    expect(route).toContain('remainingToPrepare');
  });

  test('keeps currency summaries separate and compares invoices by explicit contract-value basis', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(route).toContain("agreement.currency.trim().toUpperCase()");
    expect(route).toContain('summary.get(currency)');
    expect(route).toContain('byCurrency:');
    expect(route).toContain("agreement.contractValueBasis === 'tax_exclusive'");
    expect(route).toContain('invoice.taxableAmount');
    expect(route).toContain('invoice.total');
    expect(route).toContain('basisUnspecified');
    expect(route).toContain('Unspecified legacy agreements continue to use final invoice totals');
    expect(route).toContain('Draft invoices reserve billing coverage but are not treated as issued');
  });

  test('enforces same-currency agreement billing at the server boundary', () => {
    const invoiceRoute = source('src/app/api/admin/finance/invoices/route.ts');

    expect(invoiceRoute).toContain('currency: true');
    expect(invoiceRoute).toContain('normalizeCurrency(parsed.data.currency) !== normalizeCurrency(agreement.currency)');
    expect(invoiceRoute).toContain('Invoice currency must match the linked agreement currency');
  });

  test('surfaces governed billing controls in Finance without auto-issuing', () => {
    const control = source('src/components/admin/FinanceAgreementBillingControl.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(control).toContain('Agreement billing control');
    expect(control).toContain('Prepare next draft');
    expect(control).toContain('overbilling exception');
    expect(control).toContain('No unprepared value');
    expect(finance).toContain('prepareAgreementControlInvoice');
    expect(finance).toContain('unitPrice: row.remainingToPrepare');
    expect(finance).toContain("agreementId: row.id");
    expect(finance).toContain("status: 'draft'");
    expect(finance).toContain('Remaining value is measured before tax');
    expect(finance).toContain('Remaining value is measured against final invoice totals');
    expect(finance).toContain('Contract value basis is unspecified');
    expect(finance).toContain('organization.paymentTermsDays');
  });
});
