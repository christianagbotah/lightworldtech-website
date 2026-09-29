import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('month-close maker-checker governance', () => {
  test('stores month-close preparer, checker and rejection audit metadata', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929005500_month_close_maker_checker/migration.sql');

    expect(schema).toContain('requestedByAdminId');
    expect(schema).toContain('approvedByAdminId');
    expect(schema).toContain('rejectedByAdminId');
    expect(schema).toContain('rejectionReason');
    expect(migration).toContain('FinanceMonthClose_requestedByAdminId_status_idx');
  });

  test('submits a ready month for approval instead of locking it immediately', () => {
    const route = source('src/app/api/admin/finance/accounting/month-close/route.ts');

    expect(route).toContain("status: 'pending_approval'");
    expect(route).toContain('requestedByAdminId: actor.id');
    expect(route).toContain("action: 'admin.finance_month_close_requested'");
    expect(route).toContain('pendingApproval: true');
    expect(route).not.toContain("action: 'admin.finance_month_closed'");
  });

  test('requires an independent finance approver and rechecks close readiness', () => {
    const decision = source('src/app/api/admin/finance/accounting/month-close/[id]/decision/route.ts');

    expect(decision).toContain("'finance.approve'");
    expect(decision).toContain('pending.requestedByAdminId === actor.id');
    expect(decision).toContain('Maker-checker prevents the close preparer');
    expect(decision).toContain('assessFinanceClose');
    expect(decision).toContain('Month close can no longer be approved because finance close blockers now exist');
    expect(decision).toContain("status: 'closed'");
    expect(decision).toContain('approvedByAdminId: actor.id');
  });

  test('records rejected close requests without locking the month', () => {
    const decision = source('src/app/api/admin/finance/accounting/month-close/[id]/decision/route.ts');

    expect(decision).toContain("status: 'rejected'");
    expect(decision).toContain('rejectedByAdminId: actor.id');
    expect(decision).toContain("action: 'admin.finance_month_close_rejected'");
  });

  test('keeps super-admin-only reopening and clears stale approval metadata', () => {
    const route = source('src/app/api/admin/finance/accounting/month-close/route.ts');

    expect(route).toContain("actor.role !== 'super_admin'");
    expect(route).toContain("status: 'open'");
    expect(route).toContain("requestedByAdminId: ''");
    expect(route).toContain("approvedByAdminId: ''");
    expect(route).toContain("rejectedByAdminId: ''");
  });

  test('surfaces pending approval and independent checker actions in close workspace', () => {
    const readiness = source('src/app/api/admin/finance/accounting/close-readiness/route.ts');
    const ui = source('src/components/admin/FinanceCloseWorkspace.tsx');

    expect(readiness).toContain('canApproveClose');
    expect(readiness).toContain('canRejectClose');
    expect(readiness).toContain("monthClose?.requestedByAdminId !== actor.id");
    expect(ui).toContain('Submit close for approval');
    expect(ui).toContain('Awaiting independent finance approver');
    expect(ui).toContain('Approve & close');
    expect(ui).toContain('Reject close');
    expect(ui).toContain('/decision');
  });
});
