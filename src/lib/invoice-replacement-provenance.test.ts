import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('invoice replacement provenance', () => {
  test('stores a one-to-one self relation from corrected invoice to rejected predecessor', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928184500_invoice_replacement_provenance/migration.sql');

    expect(schema).toContain('replacesInvoiceId String?');
    expect(schema).toContain('@relation("InvoiceReplacement"');
    expect(schema).toContain('replacementInvoice ClientInvoice?');
    expect(schema).toContain('@@index([replacesInvoiceId])');
    expect(migration).toContain('CREATE UNIQUE INDEX "ClientInvoice_replacesInvoiceId_key"');
    expect(migration).toContain('REFERENCES "ClientInvoice"("id")');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  test('accepts replacements only for a rejected void invoice with identical billing context', () => {
    const route = source('src/app/api/admin/finance/invoices/route.ts');

    expect(route).toContain('replacesInvoiceId: z.string().min(1).nullable().optional()');
    expect(route).toContain("predecessor.status !== 'void' || !predecessor.rejectedAt");
    expect(route).toContain('Replacement invoice must belong to the same customer as the rejected draft');
    expect(route).toContain('Replacement invoice currency must match the rejected draft');
    expect(route).toContain('Replacement invoice must retain the rejected draft service, project, agreement and milestone context');
    expect(route).toContain('Replacement invoice must retain the rejected draft renewal cycle');
    expect(route).toContain('A replacement invoice already exists for this rejected draft');
    expect(route).toContain("'lightworld-invoice-replacement:' + parsed.data.replacesInvoiceId");
    expect(route).toContain('replacesInvoiceId: parsed.data.replacesInvoiceId || null');
  });

  test('persists predecessor id only from the corrected replacement flow', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');

    expect(finance).toContain("replacesInvoiceId: String(invoice.id || '')");
    expect(finance).toContain('replacesInvoiceId: invoiceForm.replacesInvoiceId || null');
    expect(finance).toContain("replacesInvoiceId: '', status: 'issued'");
    expect(finance).toContain("serviceId: e.target.value, agreementId: '', billingMilestoneId: '', replacesInvoiceId: ''");
  });

  test('exposes and navigates both sides of the correction chain', () => {
    const record = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(record).toContain('replacesInvoice: {');
    expect(record).toContain('replacementInvoice: {');
    expect(details).toContain('label="Replaces invoice"');
    expect(details).toContain('label="Replacement invoice"');
    expect(details).toContain("onOpenRecord({ type: 'invoice', id: data.invoice.replacesInvoice.id })");
    expect(details).toContain("onOpenRecord({ type: 'invoice', id: data.invoice.replacementInvoice.id })");
  });
});
