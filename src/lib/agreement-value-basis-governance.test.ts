import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement contract value basis governance', () => {
  test('requires a declared basis before approving a positive-value agreement', () => {
    const approval = source('src/app/api/admin/client-agreements/[id]/approval/route.ts');

    expect(approval).toContain("parsed.data.decision === 'approved'");
    expect(approval).toContain('existing.contractValue.gt(0)');
    expect(approval).toContain("existing.contractValueBasis === 'unspecified'");
    expect(approval).toContain('tax-inclusive or tax-exclusive before approving this agreement');
  });

  test('prevents an active agreement from carrying an ambiguous positive contract value', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(route).toContain("const nextStatus = parsed.data.status || existing.status");
    expect(route).toContain('const nextContractValue =');
    expect(route).toContain('const nextContractValueBasis =');
    expect(route).toContain("nextStatus === 'active'");
    expect(route).toContain('nextContractValue.gt(0)');
    expect(route).toContain("nextContractValueBasis === 'unspecified'");
    expect(route).toContain('tax-inclusive or tax-exclusive before activating this agreement');
  });

  test('keeps zero-value agreements flexible and guides staff to correct legacy records', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain("Number(agreement.contractValue || 0) > 0");
    expect(clients).toContain("agreement.contractValueBasis || 'unspecified'");
    expect(clients).toContain('Choose Tax-exclusive or Tax-inclusive below before approval or activation');
    expect(clients).toContain('disabled={basisRequired}');
    expect(clients).toContain("agreement.approvalStatus !== 'approved' || basisRequired");
    expect(clients).toContain("patchAgreement(agreement.id, { contractValueBasis: e.target.value })");
  });
});
