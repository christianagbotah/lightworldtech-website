import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement billing schedule', () => {
  test('persists ordered billing milestones under the agreement', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928162000_agreement_billing_schedule/migration.sql');

    expect(schema).toContain('billingMilestones ClientAgreementBillingMilestone[]');
    expect(schema).toContain('model ClientAgreementBillingMilestone');
    expect(schema).toContain('amount      Decimal');
    expect(schema).toContain('@@index([agreementId, order])');
    expect(migration).toContain('CREATE TABLE "ClientAgreementBillingMilestone"');
    expect(migration).toContain('CHECK ("amount" > 0)');
    expect(migration).toContain('ON DELETE CASCADE');
  });

  test('serializes schedules into the client agreement workspace', () => {
    const route = source('src/app/api/admin/clients/route.ts');
    const clients = source('src/components/admin/AdminClients.tsx');

    expect(route).toContain('billingMilestones: {');
    expect(route).toContain("orderBy: [{ order: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }]");
    expect(clients).toContain('Billing schedule');
    expect(clients).toContain('Add billing milestone');
    expect(clients).toContain('scheduledBilling');
    expect(clients).toContain('unscheduledBilling');
    expect(clients).toContain("kind: 'agreement-billing-milestone'");
    expect(clients).toContain('No invoice or payment record is deleted');
  });

  test('serializes concurrent schedule creation and prevents over-scheduling', () => {
    const route = source('src/app/api/admin/client-agreements/[id]/billing-milestones/route.ts');

    expect(route).toContain('lightworld-agreement-billing-schedule:');
    expect(route).toContain('pg_advisory_xact_lock');
    expect(route).toContain('projected.gt(agreement.contractValue)');
    expect(route).toContain('Billing schedule would exceed the agreement contract value');
    expect(route).toContain('admin.client_agreement_billing_milestone_created');
  });

  test('protects schedule integrity during milestone and agreement edits', () => {
    const milestoneRoute = source('src/app/api/admin/agreement-billing-milestones/[id]/route.ts');
    const agreementRoute = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(milestoneRoute).toContain('id: { not: existing.id }');
    expect(milestoneRoute).toContain('projected.gt(existing.agreement.contractValue)');
    expect(milestoneRoute).toContain('admin.client_agreement_billing_milestone_updated');
    expect(milestoneRoute).toContain('admin.client_agreement_billing_milestone_deleted');
    expect(agreementRoute).toContain('Contract value cannot be lower than the active billing schedule total');
    expect(agreementRoute).toContain('Remove or revise billing milestones before changing the agreement currency');
  });

  test('shows schedule coverage separately from invoice coverage in Finance', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');
    const control = source('src/components/admin/FinanceAgreementBillingControl.tsx');

    expect(route).toContain('scheduledAmount');
    expect(route).toContain('unscheduledAmount');
    expect(route).toContain('billingMilestoneCount');
    expect(route).toContain('nextMilestone');
    expect(route).toContain('Billing milestones are planning records only');
    expect(control).toContain('Scheduled');
    expect(control).toContain('Unscheduled');
    expect(control).toContain('Billing schedule');
    expect(control).toContain('Next:');
    expect(control).toContain('Prepare next draft');
  });
});
