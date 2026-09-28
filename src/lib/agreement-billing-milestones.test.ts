import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement billing milestones', () => {
  test('adds governed milestone persistence and invoice linkage', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928145500_agreement_billing_milestones/migration.sql');

    expect(schema).toContain('model ClientAgreementBillingMilestone');
    expect(schema).toContain('billingMilestones ClientAgreementBillingMilestone[]');
    expect(schema).toContain('invoice     ClientInvoice?');
    expect(schema).toContain('waiverReason String');
    expect(migration).toContain('CREATE TABLE "ClientAgreementBillingMilestone"');
    expect(migration).toContain('REFERENCES "ClientAgreement"("id")');
    expect(migration).toContain('REFERENCES "ClientInvoice"("id")');
  });

  test('prevents schedules from exceeding agreement value and gates Ready status', () => {
    const create = source('src/app/api/admin/client-agreements/[id]/billing-milestones/route.ts');
    const patch = source('src/app/api/admin/agreement-billing-milestones/[id]/route.ts');

    expect(create).toContain('nextTotal.gt(agreement.contractValue)');
    expect(create).toContain('Billing schedule would exceed the recorded agreement value');
    expect(create).toContain("parsed.data.status === 'ready'");
    expect(create).toContain("agreement.status !== 'active' || agreement.approvalStatus !== 'approved'");
    expect(patch).toContain('An invoiced billing milestone is financially locked');
    expect(patch).toContain('A waiver reason is required');
    expect(patch).toContain("data.waivedBy = actor.name || actor.email");
  });

  test('links only Ready milestones to matching invoices and preserves amount integrity', () => {
    const invoices = source('src/app/api/admin/finance/invoices/route.ts');

    expect(invoices).toContain('billingMilestoneIds: z.array');
    expect(invoices).toContain('Billing milestones must belong to the linked agreement');
    expect(invoices).toContain('Only Ready billing milestones can be invoiced');
    expect(invoices).toContain('Invoice net line value must match the selected billing milestone amount');
    expect(invoices).toContain("status: 'ready'");
    expect(invoices).toContain('data: { invoiceId: created.id }');
  });

  test('provides milestone scheduling and draft preparation in the admin workflow', () => {
    const clients = source('src/components/admin/AdminClients.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');
    const records = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(clients).toContain('Agreement billing schedule');
    expect(clients).toContain('Scheduled value cannot exceed');
    expect(clients).toContain('prepareAgreementMilestoneBilling');
    expect(clients).toContain('billingMilestoneIds: [milestone.id]');
    expect(clients).toContain('Waive milestone');
    expect(finance).toContain('billingMilestoneIds: invoiceForm.billingMilestoneIds');
    expect(finance).toContain('billingMilestoneTitle');
    expect(finance).toContain("invoiceForm.status === 'draft' ? 'Save draft invoice' : 'Issue invoice'");
    expect(records).toContain('label="Billing milestone"');
  });
});
