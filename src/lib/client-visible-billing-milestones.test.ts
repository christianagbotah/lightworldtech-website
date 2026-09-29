import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('client-visible agreement billing milestones', () => {
  test('keeps billing milestones private by default at the data layer', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929082000_client_visible_billing_milestones/migration.sql');
    const createRoute = source('src/app/api/admin/client-agreements/[id]/billing-milestones/route.ts');

    expect(schema).toContain('visibleToClient Boolean      @default(false)');
    expect(migration).toContain('ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT false');
    expect(createRoute).toContain('visibleToClient: z.boolean().optional().default(false)');
    expect(createRoute).toContain('visibleToClient: parsed.data.visibleToClient');
  });

  test('only allows client sharing from approved active agreements', () => {
    const updateRoute = source('src/app/api/admin/agreement-billing-milestones/[id]/route.ts');

    expect(updateRoute).toContain('visibleToClient: z.boolean().optional()');
    expect(updateRoute).toContain("existing.agreement.status !== 'active'");
    expect(updateRoute).toContain("existing.agreement.approvalStatus !== 'approved'");
    expect(updateRoute).toContain('Only milestones on approved active agreements can be shared with the client');
  });

  test('portal exposes only explicitly shared milestones and strips internal billing fields', () => {
    const portal = source('src/app/api/client/portal/route.ts');

    expect(portal).toContain("{ billingMilestones: { some: { visibleToClient: true } }");
    expect(portal).toContain("where: { visibleToClient: true }");
    expect(portal).toContain("invoice.billingMilestone?.visibleToClient");
    expect(portal).toContain('clientVisibleBillingMilestone');
    expect(portal).toContain('billingMilestone: clientVisibleBillingMilestone');
    expect(portal).not.toContain('readinessNote: true');
    expect(portal).not.toContain('evidenceUrl: true');
    expect(portal).not.toContain('readyBy: true');
  });

  test('admin and client UIs clearly distinguish shared from internal milestones', () => {
    const admin = source('src/components/admin/AdminClients.tsx');
    const client = source('src/components/client/ClientPortalPage.tsx');

    expect(admin).toContain("checked={milestone.visibleToClient}");
    expect(admin).toContain("Shared with client");
    expect(admin).toContain("Internal only");
    expect(client).toContain('Shared billing plan');
    expect(client).toContain('An amount becomes payable only when an issued invoice is published to your account.');
    expect(client).toContain('Billing milestone · {invoice.billingMilestone.title}');
  });
});
