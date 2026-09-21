import { describe, expect, test } from 'bun:test';
import { Prisma } from '@prisma/client';
import {
  invoiceBalance,
  invoiceStatusFromBalance,
  normalizeCurrency,
  paymentUnallocated,
  sumAmounts,
  vendorBillStatusFromBalance,
} from './finance';

describe('finance balance and status derivation', () => {
  test('derives customer balance from allocations instead of stored totals', () => {
    const allocations = [
      { amount: new Prisma.Decimal('250.25') },
      { amount: new Prisma.Decimal('149.75') },
    ];
    expect(sumAmounts(allocations).toFixed(2)).toBe('400.00');
    expect(invoiceBalance('1000.00', allocations).toFixed(2)).toBe('600.00');
  });

  test('derives unapplied customer credit from the receipt', () => {
    expect(paymentUnallocated('1000.00', [{ amount: '700.00' }]).toFixed(2)).toBe('300.00');
    expect(paymentUnallocated('100.00', [{ amount: '100.00' }]).toFixed(2)).toBe('0.00');
  });

  test('marks invoices paid partial and overdue from balance and due date', () => {
    const dueFuture = new Date('2026-10-01T00:00:00Z');
    const duePast = new Date('2026-09-01T00:00:00Z');
    const now = new Date('2026-09-21T00:00:00Z');

    expect(invoiceStatusFromBalance({
      storedStatus: 'issued',
      total: '1000',
      allocations: [{ amount: '1000' }],
      dueDate: dueFuture,
      now,
    })).toBe('paid');

    expect(invoiceStatusFromBalance({
      storedStatus: 'issued',
      total: '1000',
      allocations: [{ amount: '250' }],
      dueDate: dueFuture,
      now,
    })).toBe('partially_paid');

    expect(invoiceStatusFromBalance({
      storedStatus: 'issued',
      total: '1000',
      allocations: [],
      dueDate: duePast,
      now,
    })).toBe('overdue');
  });

  test('uses the same derived liability rules for supplier bills', () => {
    expect(vendorBillStatusFromBalance({
      storedStatus: 'unpaid',
      total: '500',
      allocations: [{ amount: '200' }],
      dueDate: new Date('2026-10-01T00:00:00Z'),
      now: new Date('2026-09-21T00:00:00Z'),
    })).toBe('partially_paid');
  });

  test('normalizes ISO currency codes without silently accepting malformed values', () => {
    expect(normalizeCurrency('ghs')).toBe('GHS');
    expect(normalizeCurrency('USD')).toBe('USD');
    expect(normalizeCurrency('not-money')).toBe('GHS');
  });
});
