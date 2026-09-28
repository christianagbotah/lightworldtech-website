import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('credit note maker-checker governance', () => {
  test('stores maker, approver and rejection provenance', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928193000_credit_note_maker_checker/migration.sql');

    expect(schema).toContain('createdByAdminId String');
    expect(schema).toContain('approvedByAdminId String');
    expect(schema).toContain('approvedAt       DateTime?');
    expect(schema).toContain('rejectedByAdminId String');
    expect(schema).toContain('rejectionReason  String');
    expect(migration).toContain('FinanceCreditNote');
  });

  test('maker-checker creation saves a draft with no applied amount or journal posting', () => {
    const route = source('src/app/api/admin/finance/credit-notes/route.ts');

    expect(route).toContain('const makerCheckerRequired = Boolean(policy?.enabled && policy.requireSecondApprover)');
    expect(route).toContain("const initialStatus = makerCheckerRequired ? 'draft' : 'posted'");
    expect(route).toContain('const initialAppliedAmount = makerCheckerRequired ? new Prisma.Decimal(0)');
    expect(route).toContain('if (!makerCheckerRequired)');
    expect(route).toContain("'admin.finance_credit_note_draft_created'");
    expect(route).toContain('pendingApproval: makerCheckerRequired');
  });

  test('a different finance approver revalidates and posts the draft exactly once', () => {
    const route = source('src/app/api/admin/finance/credit-notes/[id]/post/route.ts');

    expect(route).toContain("'finance.approve'");
    expect(route).toContain('Maker-checker prevents the credit-note preparer from posting their own draft');
    expect(route).toContain("'lightworld-invoice-lifecycle:' + draft.invoiceId");
    expect(route).toContain("where: { status: 'posted', id: { not: draft.id } }");
    expect(route).toContain('Draft credit note now exceeds the remaining creditable invoice amount');
    expect(route).toContain("status: 'posted'");
    expect(route).toContain('postCreditNoteJournal');
    expect(route).toContain('invoiceStatusFromBalance');
    expect(route).toContain("'admin.finance_credit_note_posted'");
  });

  test('rejection has no ledger or receivable side effect', () => {
    const route = source('src/app/api/admin/finance/credit-notes/[id]/reject/route.ts');

    expect(route).toContain("status: 'rejected'");
    expect(route).toContain('rejectionReason: parsed.data.reason');
    expect(route).toContain('Maker-checker prevents the credit-note preparer from rejecting their own draft');
    expect(route).not.toContain('postCreditNoteJournal');
    expect(route).not.toContain('clientInvoice.update');
  });

  test('finance approval inbox surfaces credit-note drafts and maker separation', () => {
    const route = source('src/app/api/admin/finance/approvals/route.ts');
    const ui = source('src/components/admin/FinanceOutflowApprovals.tsx');
    const credits = source('src/components/admin/FinanceCustomerCredits.tsx');

    expect(route).toContain("where: { status: 'draft' }");
    expect(route).toContain('creditNoteDrafts');
    expect(route).toContain('makerCanApprove');
    expect(ui).toContain('Pending credit-note approvals');
    expect(ui).toContain('A different approver must decide this draft.');
    expect(ui).toContain("/credit-notes/' + encodeURIComponent(note.id) + '/post");
    expect(ui).toContain("/credit-notes/' + encodeURIComponent(creditNoteReject.id) + '/reject");
    expect(credits).toContain('Credit note draft saved for second-person approval');
  });
});
