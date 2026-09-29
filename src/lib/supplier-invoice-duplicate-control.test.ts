import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeSupplierInvoiceReference } from '@/lib/supplier-invoice-reference';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('supplier invoice duplicate control', () => {
  test('normalizes formatting differences while allowing blank references', () => {
    expect(normalizeSupplierInvoiceReference(' inv-001 / 2026 ')).toBe('INV0012026');
    expect(normalizeSupplierInvoiceReference('INV 001-2026')).toBe('INV0012026');
    expect(normalizeSupplierInvoiceReference('')).toBeNull();
    expect(normalizeSupplierInvoiceReference(' - / ')).toBeNull();
  });

  test('adds a partial active-reference unique index without breaking historical duplicates', () => {
    const schema = source('prisma/schema.prisma');
    const migration = source('prisma/migrations/20260929070500_supplier_invoice_duplicate_control/migration.sql');

    expect(schema).toContain('vendorReferenceNormalized String?');
    expect(schema).toContain('@@index([vendorId, vendorReferenceNormalized])');
    expect(migration).toContain('ROW_NUMBER() OVER');
    expect(migration).toContain('duplicate_rank = 1');
    expect(migration).toContain('FinanceVendorBill_vendor_reference_active_key');
    expect(migration).toContain('"status" <> \'rejected\'');
  });

  test('serializes duplicate checks with an advisory lock and returns the existing payable', () => {
    const route = source('src/app/api/admin/finance/bills/route.ts');

    expect(route).toContain('normalizeSupplierInvoiceReference');
    expect(route).toContain('lightworld-supplier-invoice-reference:');
    expect(route).toContain('pg_advisory_xact_lock');
    expect(route).toContain('vendorReferenceNormalized');
    expect(route).toContain("status: { not: 'rejected' }");
    expect(route).toContain('admin.finance_supplier_bill_duplicate_blocked');
    expect(route).toContain('existingPayableNumber');
    expect(route).toContain('is already recorded as');
  });

  test('preserves original supplier reference for display and audit', () => {
    const route = source('src/app/api/admin/finance/bills/route.ts');

    expect(route).toContain('vendorReference: parsed.data.vendorReference');
    expect(route).toContain('vendorReference: bill.vendorReference');
  });
});
