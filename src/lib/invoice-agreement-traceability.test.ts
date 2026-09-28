import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('invoice agreement traceability', () => {
  test('persists an optional agreement relation without constraining existing invoices', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928142500_invoice_agreement_traceability/migration.sql');

    expect(schema).toContain('invoices          ClientInvoice[]');
    expect(schema).toContain('agreementId    String?');
    expect(schema).toContain('agreement      ClientAgreement?');
    expect(schema).toContain('@@index([agreementId])');
    expect(migration).toContain('ADD COLUMN "agreementId" TEXT');
    expect(migration).toContain('REFERENCES "ClientAgreement"("id")');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  test('validates agreement ownership, approval and project consistency before invoice creation', () => {
    const route = source('src/app/api/admin/finance/invoices/route.ts');

    expect(route).toContain('agreementId: z.string().min(1).nullable().optional()');
    expect(route).toContain('organizationId: parsed.data.organizationId');
    expect(route).toContain("agreement.status !== 'active' || agreement.approvalStatus !== 'approved'");
    expect(route).toContain('Invoice project must match the linked agreement project');
    expect(route).toContain('agreementId: parsed.data.agreementId || null');
    expect(route).toContain('agreementId: invoice.agreementId');
  });

  test('carries the agreement through the finance draft and exposes it in invoice details', () => {
    const finance = source('src/components/admin/AdminFinance.tsx');
    const recordRoute = source('src/app/api/admin/finance/records/[type]/[id]/route.ts');
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(finance).toContain('agreementId: deepLinkAgreementBilling.agreementId');
    expect(finance).toContain('agreementId: invoiceForm.agreementId || null');
    expect(finance).toContain('Originating agreement');
    expect(finance).toContain('This draft will retain the agreement link for audit traceability');
    expect(finance).toContain("status: 'draft'");
    expect(recordRoute).toContain('agreement: {');
    expect(recordRoute).toContain('referenceNumber: true');
    expect(details).toContain('label="Originating agreement"');
    expect(details).toContain('data.invoice.agreement.title');
  });
});
