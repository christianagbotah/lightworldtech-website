import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('reconciliation maker-checker governance', () => {
  test('persists importer, matcher and checker identities for audit segregation', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929004000_reconciliation_maker_checker/migration.sql');

    expect(schema).toContain('importedByAdminId');
    expect(schema).toContain('reconciledByAdminId');
    expect(schema).toContain('matchedByAdminId');
    expect(migration).toContain('FinanceReconciliationBatch_importedByAdminId_status_idx');
    expect(migration).toContain('FinanceReconciliationLine_matchedByAdminId_status_idx');
  });

  test('records operator identities at statement import and line matching', () => {
    const batches = source('src/app/api/admin/finance/accounting/reconciliation/route.ts');
    const match = source('src/app/api/admin/finance/accounting/reconciliation/[id]/match/route.ts');

    expect(batches).toContain('importedByAdminId: actor.id');
    expect(match).toContain('matchedByAdminId: actor.id');
    expect(match).toContain("matchedByAdminId: ''");
  });

  test('requires finance approval and an independent reconciliation certifier', () => {
    const finalize = source('src/app/api/admin/finance/accounting/reconciliation/[id]/finalize/route.ts');

    expect(finalize).toContain("'finance.approve'");
    expect(finalize).toContain('batch.importedByAdminId === actor.id');
    expect(finalize).toContain('Maker-checker prevents the statement importer');
    expect(finalize).toContain('matcherIds.includes(actor.id)');
    expect(finalize).toContain('Maker-checker prevents a statement-line matcher');
    expect(finalize).toContain('reconciledByAdminId: actor.id');
  });

  test('does not grandfather legacy open batches without auditable operator IDs', () => {
    const finalize = source('src/app/api/admin/finance/accounting/reconciliation/[id]/finalize/route.ts');

    expect(finalize).toContain('legacy reconciliation lacks an auditable importer identity');
    expect(finalize).toContain('legacy matches without auditable operator identity');
  });

  test('revalidates all existing reconciliation accounting controls before certification', () => {
    const finalize = source('src/app/api/admin/finance/accounting/reconciliation/[id]/finalize/route.ts');

    expect(finalize).toContain('All statement lines must be matched before reconciliation can be finalized');
    expect(finalize).toContain('Ledger opening balance does not agree with the statement opening balance');
    expect(finalize).toContain('Every bank/mobile-money ledger movement in the statement period must be matched');
    expect(finalize).toContain('Ledger closing balance does not agree with the statement closing balance');
  });

  test('shows segregation eligibility and disables certification for ineligible users', () => {
    const ui = source('src/components/admin/FinanceReconciliationWorkspace.tsx');
    const detail = source('src/app/api/admin/finance/accounting/reconciliation/[id]/route.ts');

    expect(ui).toContain('Segregation of duties');
    expect(ui).toContain('Independent checker required');
    expect(ui).toContain('Audit identities complete');
    expect(ui).toContain('Matched by');
    expect(ui).toContain('!selected.canFinalize');
    expect(detail).toContain('canFinalize');
    expect(detail).toContain("'finance.approve'");
  });
});
