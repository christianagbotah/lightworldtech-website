import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('agreement billing milestone governance', () => {
  test('adds lifecycle, waiver audit and invoice-history persistence', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928173000_agreement_billing_milestone_governance/migration.sql');

    expect(schema).toContain('status       String          @default("planned")');
    expect(schema).toContain('waiverReason String');
    expect(schema).toContain('invoices     ClientInvoice[] @relation("AgreementBillingMilestoneInvoices")');
    expect(schema).toContain('billingMilestoneId String?');
    expect(schema).toContain('@@index([billingMilestoneId])');
    expect(migration).toContain('ADD COLUMN "billingMilestoneId" TEXT');
    expect(migration).toContain('REFERENCES "ClientAgreementBillingMilestone"("id")');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  test('governs ready and waived milestones while preserving schedule integrity', () => {
    const create = source('src/app/api/admin/client-agreements/[id]/billing-milestones/route.ts');
    const patch = source('src/app/api/admin/agreement-billing-milestones/[id]/route.ts');
    const agreement = source('src/app/api/admin/client-agreements/[id]/route.ts');

    expect(create).toContain("status: z.enum(['planned', 'ready'])");
    expect(create).toContain("status: { not: 'waived' }");
    expect(create).toContain('Only approved active agreements can have billing milestones marked Ready');
    expect(patch).toContain("status: z.enum(['planned', 'ready', 'waived'])");
    expect(patch).toContain('A waiver reason is required');
    expect(patch).toContain("invoice.status !== 'void'");
    expect(patch).toContain('financially locked');
    expect(patch).toContain('invoice history cannot be deleted');
    expect(agreement).toContain("status: { not: 'waived' }");
  });

  test('links exactly one live invoice to a ready milestone using agreement tax basis', () => {
    const invoices = source('src/app/api/admin/finance/invoices/route.ts');

    expect(invoices).toContain('billingMilestoneId: z.string().min(1).nullable().optional()');
    expect(invoices).toContain('Only Ready billing milestones can be invoiced');
    expect(invoices).toContain('lightworld-billing-milestone-invoice:');
    expect(invoices).toContain("status: { not: 'void' }");
    expect(invoices).toContain("basis === 'tax_exclusive' ? taxableAmount : total");
    expect(invoices).toContain('Invoice pre-tax value must match the selected billing milestone amount');
    expect(invoices).toContain('Invoice final total must match the selected billing milestone amount');
    expect(invoices).toContain('billingMilestoneId: parsed.data.billingMilestoneId || null');
    expect(invoices).toContain('billingMilestoneId: invoice.billingMilestoneId');
  });

  test('carries milestone provenance through governed draft preparation and invoice details', () => {
    const clients = source('src/components/admin/AdminClients.tsx');
    const finance = source('src/components/admin/AdminFinance.tsx');
    const records = source('src/components/admin/FinanceRecordDetailsDialog.tsx');
    const recordRoute = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');

    expect(clients).toContain('prepareAgreementMilestoneBilling');
    expect(clients).toContain("milestone.status !== 'ready'");
    expect(clients).toContain("invoice.status !== 'void'");
    expect(clients).toContain('billingMilestoneId: milestone.id');
    expect(clients).toContain('Prepare draft');
    expect(clients).toContain('Waive milestone');
    expect(clients).toContain('Previous void invoice');
    expect(finance).toContain('billingMilestoneId: String(parsed.billingMilestoneId ||');
    expect(finance).toContain('billingMilestoneId: invoiceForm.billingMilestoneId || null');
    expect(finance).toContain('Billing milestone:');
    expect(finance).toContain("invoiceForm.status === 'draft' ? 'Save draft invoice' : 'Issue invoice'");
    expect(recordRoute).toContain('billingMilestone: {');
    expect(records).toContain('label="Billing milestone"');
  });

  test('keeps executive billing control aligned with active milestone lifecycle', () => {
    const route = source('src/app/api/admin/finance/agreement-billing/route.ts');
    const control = source('src/components/admin/FinanceAgreementBillingControl.tsx');

    expect(route).toContain("milestone.status !== 'waived'");
    expect(route).toContain('milestone.invoices.length === 0');
    expect(route).toContain('Waived milestones are excluded from active scheduled value');
    expect(route).toContain('status: nextMilestone.status');
    expect(control).toContain('pretty(row.nextMilestone.status)');
  });
});
