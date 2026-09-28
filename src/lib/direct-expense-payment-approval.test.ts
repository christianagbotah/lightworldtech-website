import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('direct expense payment maker-checker governance', () => {
  test('recognizes the expense first and defers cash settlement when approval policy is enabled', () => {
    const route = source('src/app/api/admin/finance/expenses/route.ts');

    expect(route).toContain('const settlementRequiresApproval = Boolean(policy?.enabled && parsed.data.paidAt)');
    expect(route).toContain('paidAt: settlementRequiresApproval ? null');
    expect(route).toContain('paidAt: settlementRequiresApproval ? null : created.paidAt');
    expect(route).toContain("outflowType: 'direct_expense_payment'");
    expect(route).toContain('}, tx)');
    expect(route).toContain('pendingApproval: Boolean(approval)');
    expect(route).toContain('{ status: approval ? 202 : 201 }');
  });

  test('uses a separate accrued-expense settlement journal for approved cash movement', () => {
    const ledger = source('src/lib/finance-ledger.ts');
    const approvals = source('src/lib/finance-approvals.ts');

    expect(ledger).toContain('export async function postExpenseSettlementJournal');
    expect(ledger).toContain("sourceType: 'finance_expense_payment'");
    expect(ledger).toContain("systemKey: 'accrued_expenses'");
    expect(ledger).toContain('systemKey: cashSystemKey(input.method)');
    expect(approvals).toContain("'direct_expense_payment'");
    expect(approvals).toContain("if (approval.outflowType === 'direct_expense_payment')");
    expect(approvals).toContain("if (expense.paidAt) throw new Error('Direct expense has already been settled')");
    expect(approvals).toContain('expense.amount.eq(approval.amount)');
    expect(approvals).toContain('postExpenseSettlementJournal');
  });

  test('keeps maker-checker separation and supports scheduled execution', () => {
    const approvalRoute = source('src/app/api/admin/finance/approvals/[id]/route.ts');

    expect(approvalRoute).toContain('Maker-checker prevents you from deciding your own outflow request');
    expect(approvalRoute).toContain('Maker-checker prevents the requester from executing their own scheduled outflow');
    expect(approvalRoute).toContain("approval.outflowType === 'direct_expense_payment'");
    expect(approvalRoute).toContain("'admin.finance_expense_payment_approved'");
    expect(approvalRoute).toContain("entity: 'FinanceExpense'");
  });

  test('can resubmit an unpaid expense without creating a duplicate expense', () => {
    const requestRoute = source('src/app/api/admin/finance/expenses/[id]/payment-request/route.ts');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(requestRoute).toContain("outflowType: 'direct_expense_payment'");
    expect(requestRoute).toContain("status: { in: ['pending', 'scheduled'] }");
    expect(requestRoute).toContain('A payment request already exists for this expense');
    expect(requestRoute).toContain('Payment date cannot be earlier than the incurred date');
    expect(requestRoute).toContain('postExpenseSettlementJournal');
    expect(details).toContain('Request payment');
    expect(details).toContain('/payment-request');
    expect(details).toContain('different finance approver must authorize the cash movement');
  });

  test('surfaces direct expense settlement requests in the existing approvals inbox', () => {
    const inbox = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(inbox).toContain("'direct_expense_payment'");
    expect(finance).toContain('Expense recorded; payment submitted for approval');
  });
});
