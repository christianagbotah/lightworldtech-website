import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('client agreement lineage privacy', () => {
  test('keeps draft and unapproved agreements out of the client portal', () => {
    const portal = source('src/app/api/client/portal/route.ts');

    expect(portal).toContain("approvalStatus: 'approved'");
    expect(portal).toContain("status: { not: 'draft' }");
    expect(portal).toContain('attachments: { some: { visibleToClient: true } }');
    expect(portal).toContain('billingMilestones: { some: { visibleToClient: true } }');
  });

  test('sanitizes replacement lineage and never exposes draft or unapproved counterparts', () => {
    const portal = source('src/app/api/client/portal/route.ts');
    const client = source('src/components/client/ClientPortalPage.tsx');

    expect(portal).toContain('supersedesAgreement: {');
    expect(portal).toContain('supersededByAgreement: {');
    expect(portal).toContain("related.approvalStatus === 'approved' && related.status !== 'draft'");
    expect(client).toContain('Agreement history');
    expect(client).toContain('This agreement replaces');
    expect(client).toContain('This agreement has been superseded by');
    expect(client).toContain('Draft or unapproved replacement agreements are never shown in the client portal');
  });

  test('blocks direct client downloads for draft or unapproved agreement files', () => {
    const attachments = source('src/app/api/agreement-attachments/[id]/route.ts');

    expect(attachments).toContain("attachment.agreement.approvalStatus !== 'approved'");
    expect(attachments).toContain("attachment.agreement.status === 'draft'");
    expect(attachments).toContain('Agreement files can be shared with clients only after the agreement is approved and no longer draft');
  });

  test('guides administrators instead of exposing unavailable sharing actions', () => {
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(clients).toContain('Share after approval');
    expect(clients).toContain('Visibility flag · access blocked');
    expect(clients).toContain('Client sharing is available only after agreement approval and activation / non-draft status');
  });
});
