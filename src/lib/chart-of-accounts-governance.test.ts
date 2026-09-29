import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('chart of accounts structural governance', () => {
  test('requires finance approval permission to create ledger accounts', () => {
    const route = source('src/app/api/admin/finance/accounting/accounts/route.ts');

    expect(route).toContain("'finance.manage'");
    expect(route).toContain("'finance.approve'");
    expect(route).toContain('Finance approval permission is required to create ledger accounts');
  });

  test('makes account code and type immutable once journal history exists', () => {
    const route = source('src/app/api/admin/finance/accounting/accounts/[id]/route.ts');

    expect(route).toContain('current._count.journalLines > 0 && (codeChanged || typeChanged)');
    expect(route).toContain('Account code and type are immutable after journal history exists');
    expect(route).toContain('Create a new account and stop future posting to the old account instead');
  });

  test('requires finance approval for posting-state and structural changes', () => {
    const route = source('src/app/api/admin/finance/accounting/accounts/[id]/route.ts');

    expect(route).toContain('controlledStructuralChange');
    expect(route).toContain('activeChanged');
    expect(route).toContain('postingChanged');
    expect(route).toContain("'finance.approve'");
    expect(route).toContain('Finance approval permission is required for structural ledger account changes');
  });

  test('keeps system account repurposing protections intact', () => {
    const route = source('src/app/api/admin/finance/accounting/accounts/[id]/route.ts');

    expect(route).toContain('current.systemKey');
    expect(route).toContain('System ledger accounts cannot be repurposed or disabled');
  });

  test('audits previous structural state alongside the resulting account', () => {
    const route = source('src/app/api/admin/finance/accounting/accounts/[id]/route.ts');

    expect(route).toContain('structuralChange: controlledStructuralChange');
    expect(route).toContain('previousCode: current.code');
    expect(route).toContain('previousType: current.type');
    expect(route).toContain('previousActive: current.active');
    expect(route).toContain('previousAllowPosting: current.allowPosting');
  });
});
