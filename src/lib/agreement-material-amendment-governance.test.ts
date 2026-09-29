import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement material amendment governance', () => {
  test('identifies material commercial changes and resets prior decisions before activation', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(route).toContain('const projectChanged =');
    expect(route).toContain('const currencyChanged =');
    expect(route).toContain('const contractValueChanged =');
    expect(route).toContain('const contractValueBasisChanged =');
    expect(route).toContain('const materialCommercialChange =');
    expect(route).toContain("['approved', 'rejected'].includes(existing.approvalStatus)");
    expect(route).toContain("approvalStatus: 'pending'");
    expect(route).toContain('re-approval is required');
    expect(route).toContain("changeType: requiresReapproval");
    expect(route).toContain("'material_amendment'");
  });

  test('blocks in-place commercial rewrites on active agreements', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(route).toContain("existing.status === 'active' && materialCommercialChange && !legacyBasisCorrectionOnly");
    expect(route).toContain('Active agreement commercial terms cannot be changed in place');
    expect(route).toContain('Terminate or supersede the agreement');
    expect(route).toContain("parsed.data.status === 'active' && materialCommercialChange");
    expect(route).toContain('obtain a new approval decision before activation');
  });

  test('allows one audited legacy basis correction without opening active terms generally', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(route).toContain("existing.contractValueBasis === 'unspecified'");
    expect(route).toContain("parsed.data.contractValueBasis !== 'unspecified'");
    expect(route).toContain("'legacy_basis_correction'");
    expect(route).toContain('legacyBasisCorrectionOnly');
    expect(clients).toContain("agreement.status === 'active' && agreement.contractValueBasis !== 'unspecified'");
    expect(clients).toContain('Active agreement commercial basis is locked');
  });

  test('tells operators when a material amendment has invalidated the prior decision', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain('payload?.governance?.approvalReset');
    expect(clients).toContain('Agreement returned to pending approval');
    expect(clients).toContain('payload?.governance?.legacyBasisCorrectionOnly');
    expect(clients).toContain('Legacy contract value basis corrected and audited');
  });
});
