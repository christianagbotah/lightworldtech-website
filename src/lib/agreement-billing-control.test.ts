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

  test('keeps currency summaries separate and explains tax-basis ambiguity', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(route).toContain("agreement.currency.trim().toUpperCase()");
    expect(route).toContain('summary.get(currency)');
    expect(route).toContain('byCurrency:');
    expect(route).toContain('tax-inclusive or tax-exclusive');
    expect(route).toContain('Draft invoices reserve billing coverage but are not treated as issued');
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
    expect(finance).toContain('remaining unrepresented contract value is a billing-control reference only');
    expect(finance).toContain('organization.paymentTermsDays');
  });
});
