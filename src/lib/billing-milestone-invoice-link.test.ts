import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('billing milestone invoice provenance', () => {
  test('links invoices to agreement billing milestones without hard one-to-one replacement constraints', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928165500_billing_milestone_invoice_link/migration.sql');

    expect(schema).toContain('invoices    ClientInvoice[]');
    expect(schema).toContain('billingMilestoneId String?');
    expect(schema).toContain('billingMilestone   ClientAgreementBillingMilestone?');
    expect(schema).toContain('@@index([billingMilestoneId])');
    expect(migration).toContain('ADD COLUMN "billingMilestoneId" TEXT');
    expect(migration).toContain('REFERENCES "ClientAgreementBillingMilestone"("id")');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  test('validates milestone ownership and serializes duplicate-billing checks', () => {
    const route = source('src/app/api/admin/finance/invoices/route.ts');

    expect(route).toContain('billingMilestoneId: z.string().min(1).nullable().optional()');
    expect(route).toContain('Billing milestone invoices must be linked to their agreement');
    expect(route).toContain('Billing milestone does not belong to the linked agreement');
    expect(route).toContain('lightworld-billing-milestone-invoice:');
    expect(route).toContain('pg_advisory_xact_lock');
    expect(route).toContain("status: { not: 'void' }");
    expect(route).toContain('A non-void invoice already exists for this billing milestone');
    expect(route).toContain('billingMilestoneId: parsed.data.billingMilestoneId || null');
  });

  test('selects only an unbilled schedule milestone for the next draft', () => {
    const controlRoute = source('src/app/api/admin/finance/agreement-billing/route.ts');

    expect(controlRoute).toContain("invoices: {");
    expect(controlRoute).toContain("where: { status: { not: 'void' } }");
    expect(controlRoute).toContain('filter((milestone) => milestone.invoices.length === 0)');
    expect(controlRoute).toContain('billedMilestoneCount');
    expect(controlRoute).toContain('unbilledMilestoneCount');
    expect(controlRoute).toContain('voiding that invoice makes the milestone eligible for replacement billing');
  });

  test('prefills the next milestone amount and keeps the draft non-binding', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(finance).toContain('billingMilestoneId: row.nextMilestone?.id ||');
    expect(finance).toContain('const milestoneAmount = row.nextMilestone?.amount || row.remainingToPrepare');
    expect(finance).toContain('unitPrice: milestoneAmount');
    expect(finance).toContain("status: 'draft'");
    expect(finance).toContain('Prepared for billing milestone');
    expect(finance).toContain('billingMilestoneId: invoiceForm.billingMilestoneId || null');
  });

  test('shows milestone provenance on invoice details', () => {
    const route = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(route).toContain('billingMilestone: {');
    expect(route).toContain('amount: true');
    expect(details).toContain('label="Billing milestone"');
    expect(details).toContain('data.invoice.billingMilestone.title');
  });
});
