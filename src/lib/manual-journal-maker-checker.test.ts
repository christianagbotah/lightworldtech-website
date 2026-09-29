import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('manual journal maker-checker governance', () => {
  test('stores manual journal approval metadata while keeping postedAt nullable for drafts', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929002500_manual_journal_maker_checker/migration.sql');

    expect(schema).toContain('createdByAdminId');
    expect(schema).toContain('approvedByAdminId');
    expect(schema).toContain('rejectedByAdminId');
    expect(schema).toContain('rejectionReason');
    expect(schema).toContain('postedAt           DateTime?');
    expect(migration).toContain('ALTER COLUMN "postedAt" DROP NOT NULL');
    expect(migration).toContain('FinanceJournalEntry_createdByAdminId_status_idx');
  });

  test('creates manual journals as drafts instead of posting directly', () => {
    const route = source('src/app/api/admin/finance/accounting/journals/route.ts');

    expect(route).toContain("sourceType: 'manual'");
    expect(route).toContain("status: 'draft'");
    expect(route).toContain('createdByAdminId: actor.id');
    expect(route).toContain('postedAt: null');
    expect(route).toContain("action: 'admin.finance_journal_draft_created'");
    expect(route).toContain('pendingApproval: true');
  });

  test('requires an independent finance approver and revalidates ledger controls before posting', () => {
    const decision = source('src/app/api/admin/finance/accounting/journals/[id]/decision/route.ts');

    expect(decision).toContain("'finance.approve'");
    expect(decision).toContain('journal.createdByAdminId === actor.id');
    expect(decision).toContain('Maker-checker prevents the journal preparer from deciding their own draft');
    expect(decision).toContain('No accounting period covers this journal date');
    expect(decision).toContain('The month for this journal date is closed');
    expect(decision).toContain('!line.account.active || !line.account.allowPosting');
    expect(decision).toContain("status: 'posted'");
    expect(decision).toContain('approvedByAdminId: actor.id');
    expect(decision).toContain('postedAt: approvedAt');
  });

  test('submits reversal drafts without mutating the original until checker approval', () => {
    const reverse = source('src/app/api/admin/finance/accounting/journals/[id]/reverse/route.ts');
    const decision = source('src/app/api/admin/finance/accounting/journals/[id]/decision/route.ts');

    expect(reverse).toContain("sourceType: 'reversal'");
    expect(reverse).toContain("status: 'draft'");
    expect(reverse).toContain("action: 'admin.finance_journal_reversal_requested'");
    expect(reverse).not.toContain("data: { status: 'reversed' }");
    expect(decision).toContain("journal.sourceType === 'reversal'");
    expect(decision).toContain("data: { status: 'reversed' }");
    expect(decision).toContain('Another pending or posted reversal already exists');
  });

  test('surfaces draft review and modern approve/reject actions in accounting workspace', () => {
    const ui = source('src/components/admin/FinanceAccountingWorkspace.tsx');

    expect(ui).toContain('Manual journals and reversals require an independent checker');
    expect(ui).toContain('Prepare journal');
    expect(ui).toContain('Submit for approval');
    expect(ui).toContain('Submit reversal for approval');
    expect(ui).toContain('Approve & post');
    expect(ui).toContain('Reject draft');
    expect(ui).toContain('Awaiting checker');
    expect(ui).toContain('/decision');
  });

  test('leaves automatic source journals immediately posted and attributable', () => {
    const ledger = source('src/lib/finance-ledger.ts');

    expect(ledger).toContain("status: 'posted'");
    expect(ledger).toContain('createdBy: input.postedBy');
    expect(ledger).toContain('approvedBy: input.postedBy');
    expect(ledger).toContain('postedAt: new Date()');
  });
});
