import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('governed issued invoice voiding', () => {
  test('persists the void actor, time and reason', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260928190500_governed_invoice_voiding/migration.sql');

    expect(schema).toContain('voidedByAdminId String');
    expect(schema).toContain('voidedBy      String');
    expect(schema).toContain('voidedAt      DateTime?');
    expect(schema).toContain('voidReason    String');
    expect(migration).toContain('ADD COLUMN "voidedByAdminId"');
    expect(migration).toContain('ADD COLUMN "voidReason"');
  });

  test('requires approval authority, a meaningful reason and maker-checker separation', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain("value.status === 'void'");
    expect(route).toContain('A meaningful void reason of at least 5 characters is required');
    expect(route).toContain("'finance.approve'");
    expect(route).toContain('Maker-checker prevents the invoice preparer from voiding their own invoice');
    expect(route).toContain('An invoice with allocated payments cannot be voided');
    expect(route).toContain('voidedByAdminId: actor.id');
    expect(route).toContain('voidedBy: actor.name || actor.email');
    expect(route).toContain('voidedAt');
  });

  test('reverses accounting and disables customer payment surfaces when voided', () => {
    const route = source('src/app/api/admin/finance/invoices/[id]/route.ts');

    expect(route).toContain('postInvoiceVoidJournal');
    expect(route).toContain('invoiceAccessLink.updateMany');
    expect(route).toContain("status: 'revoked'");
    expect(route).toContain('hubtelPaymentIntent.updateMany');
    expect(route).toContain("status: 'cancelled_invoice_void'");
    expect(route).toContain("'admin.finance_invoice_voided'");
    expect(route).toContain("'admin.finance_invoice_void_blocked'");
  });

  test('holds late verified Hubtel payments as unapplied customer credit', () => {
    const hubtel = source('src/lib/hubtel-payment.ts');

    expect(hubtel).toContain("'lightworld-invoice-lifecycle:' + intent.invoiceId");
    expect(hubtel).toContain("const invoiceVoided = invoice.status === 'void'");
    expect(hubtel).toContain("invoiceVoided\n      ? new Prisma.Decimal(0)");
    expect(hubtel).toContain('held as unapplied customer credit');
    expect(hubtel).toContain("'paid_after_invoice_void'");
  });

  test('requires an explicit destructive confirmation in the finance record UI', () => {
    const details = source('src/components/admin/FinanceRecordDetailsDialog.tsx');

    expect(details).toContain('Void invoice');
    expect(details).toContain('Reason for voiding');
    expect(details).toContain("body: JSON.stringify({ status: 'void', voidReason: reason })");
    expect(details).toContain('Finance approval permission is required');
    expect(details).toContain('data.invoice.voidedAt');
    expect(details).toContain('data.invoice.voidReason');
  });
});
