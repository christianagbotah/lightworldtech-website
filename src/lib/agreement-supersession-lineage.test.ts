import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement supersession lineage', () => {
  test('stores a one-to-one predecessor replacement relation', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929093000_agreement_supersession_lineage/migration.sql');

    expect(schema).toContain('supersedesAgreementId String?');
    expect(schema).toContain('@relation("AgreementSupersession"');
    expect(schema).toContain('supersededByAgreement ClientAgreement?');
    expect(migration).toContain('ADD COLUMN "supersedesAgreementId" TEXT');
    expect(migration).toContain('CREATE UNIQUE INDEX "ClientAgreement_supersedesAgreementId_key"');
    expect(migration).toContain('REFERENCES "ClientAgreement"("id")');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  test('creates a replacement draft without cloning contractual commitments', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/replacement/route.ts');

    expect(route).toContain("source.status !== 'active' || source.approvalStatus !== 'approved'");
    expect(route).toContain('supersedesAgreementId: source.id');
    expect(route).toContain("status: 'draft'");
    expect(route).toContain("referenceNumber: ''");
    expect(route).toContain('sourceRemainsActive: true');
    expect(route).toContain('commitmentsCloned: false');
    expect(route).toContain("'replacement_draft_created'");
    expect(route).toContain("error.code === 'P2002'");
    expect(route).not.toContain('billingMilestones: { create');
    expect(route).not.toContain('obligations: { create');
    expect(route).not.toContain('attachments: { create');
  });

  test('atomically supersedes the predecessor only when an approved replacement activates', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(route).toContain("parsed.data.status === 'active'");
    expect(route).toContain('Boolean(existing.supersedesAgreementId)');
    expect(route).toContain("where: { id: existing.supersedesAgreementId, status: 'active' }");
    expect(route).toContain("data: { status: 'superseded' }");
    expect(route).toContain("'superseded_by_replacement'");
    expect(route).toContain('admin.client_agreement_superseded_by_replacement');
    expect(route).toContain('SupersessionConflictError');
  });

  test('reserves superseded status for the replacement workflow and exposes lineage to operators', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/route.ts');
    const clientsApi = source('src/app/api/admin/clients/route.ts');
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(route).toContain('Superseded status is managed by the replacement-agreement workflow');
    expect(clientsApi).toContain('supersedesAgreement: {');
    expect(clientsApi).toContain('supersededByAgreement: {');
    expect(clients).toContain('Agreement lineage');
    expect(clients).toContain('Create replacement draft');
    expect(clients).toContain('The predecessor remains active until an approved replacement is activated');
    expect(clients).toContain('Billing milestones, obligations, attachments and invoices are not cloned');
    expect(clients).toContain("disabled={agreement.status !== 'superseded'}");
  });
});
