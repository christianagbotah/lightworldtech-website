import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('billing milestone readiness governance', () => {
  test('persists readiness state, evidence and accountable confirmation metadata', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928173500_billing_milestone_readiness/migration.sql');

    expect(schema).toContain('readinessStatus String');
    expect(schema).toContain('readinessNote  String');
    expect(schema).toContain('evidenceUrl    String');
    expect(schema).toContain('readyAt        DateTime?');
    expect(schema).toContain('readyBy        String');
    expect(migration).toContain('ADD COLUMN "readinessStatus"');
    expect(migration).toContain('ADD COLUMN "readinessNote"');
    expect(migration).toContain('ADD COLUMN "evidenceUrl"');
    expect(migration).toContain('ClientAgreementBillingMilestone_readinessStatus_dueDate_idx');
  });

  test('requires an acceptance note before readiness and protects billed milestone integrity', () => {
    const route = source('src/app/api/admin/agreement-billing-milestones/[id]/route.ts');

    expect(route).toContain("readinessStatus: z.enum(['planned', 'ready_to_bill']).optional()");
    expect(route).toContain('A readiness note is required before a milestone can be marked ready to bill');
    expect(route).toContain('Billed milestone terms cannot be changed while a non-void invoice is linked');
    expect(route).toContain('A billed milestone cannot be returned to planned status while a non-void invoice is linked');
    expect(route).toContain('A billed milestone cannot be deleted while a non-void invoice is linked');
    expect(route).toContain("readinessStatus: 'ready_to_bill'");
    expect(route).toContain('readyBy: existing.readinessStatus');
  });

  test('enforces readiness again at the finance invoice boundary', () => {
    const route = source('src/app/api/admin/finance/invoices/route.ts');

    expect(route).toContain('readinessStatus: true');
    expect(route).toContain("milestone.readinessStatus !== 'ready_to_bill'");
    expect(route).toContain('Billing milestone must be marked ready to bill before an invoice draft can be created');
  });

  test('exposes only ready unbilled milestones for finance drafting', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(route).toContain("milestone.readinessStatus === 'ready_to_bill'");
    expect(route).toContain('milestone.invoices.length === 0');
    expect(route).toContain('readyUnbilledMilestoneCount');
    expect(route).toContain('plannedUnbilledMilestoneCount');
    expect(route).toContain('Finance can prepare drafts only from ready, unbilled milestones');
  });

  test('shows readiness state in both client management and finance', () => {
    const clients = source('src/components/admin/AdminClients.tsx');
    const control = source('src/components/admin/FinanceAgreementBillingControl.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(clients).toContain('Readiness / acceptance note');
    expect(clients).toContain('Mark ready to bill');
    expect(clients).toContain('Return to planned');
    expect(clients).toContain('Billed ·');
    expect(clients).toContain('Evidence URL');
    expect(control).toContain('Awaiting milestone readiness confirmation');
    expect(control).toContain('Await readiness');
    expect(control).toContain('readyUnbilledMilestoneCount');
    expect(finance).toContain('No unbilled milestone is ready to bill');
    expect(finance).toContain('Prepared for ready billing milestone');
  });
});
