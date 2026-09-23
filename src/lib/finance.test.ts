import { describe, expect, test } from 'bun:test';
import { Prisma } from '@prisma/client';
import {
  accountNormalSide,
  computeTaxComponents,
  invoiceBalance,
  isBalancedJournal,
  journalTotals,
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

  test('reduces invoice balances by applied credit notes without double-counting refundable credit', () => {
    expect(invoiceBalance(
      '1000.00',
      [{ amount: '250.00' }],
      [{ appliedAmount: '300.00' }],
    ).toFixed(2)).toBe('450.00');

    expect(invoiceStatusFromBalance({
      storedStatus: 'issued',
      total: '1000.00',
      allocations: [{ amount: '400.00' }],
      credits: [{ appliedAmount: '600.00' }],
      dueDate: new Date('2026-10-01T00:00:00Z'),
      now: new Date('2026-09-23T00:00:00Z'),
    })).toBe('paid');
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

  test('calculates governed Ghana standard VAT components from one taxable base', () => {
    const result = computeTaxComponents({
      taxableAmount: '1000.00',
      treatment: 'standard',
      vatRate: '15.00',
      nhilRate: '2.50',
      getfundRate: '2.50',
    });

    expect(result.vatAmount.toFixed(2)).toBe('150.00');
    expect(result.nhilAmount.toFixed(2)).toBe('25.00');
    expect(result.getfundAmount.toFixed(2)).toBe('25.00');
    expect(result.tax.toFixed(2)).toBe('200.00');
    expect(result.total.toFixed(2)).toBe('1200.00');
  });

  test('keeps zero-rated exempt and no-tax transactions at zero tax', () => {
    for (const treatment of ['zero', 'exempt', 'none'] as const) {
      const result = computeTaxComponents({
        taxableAmount: '850.75',
        treatment,
        vatRate: '15',
        nhilRate: '2.5',
        getfundRate: '2.5',
      });
      expect(result.tax.toFixed(2)).toBe('0.00');
      expect(result.total.toFixed(2)).toBe('850.75');
    }
  });

  test('preserves explicit legacy tax without inventing statutory components', () => {
    const result = computeTaxComponents({
      taxableAmount: '1000.00',
      treatment: 'legacy',
      legacyTax: '175.25',
      vatRate: '15',
      nhilRate: '2.5',
      getfundRate: '2.5',
    });

    expect(result.vatAmount.toFixed(2)).toBe('0.00');
    expect(result.nhilAmount.toFixed(2)).toBe('0.00');
    expect(result.getfundAmount.toFixed(2)).toBe('0.00');
    expect(result.tax.toFixed(2)).toBe('175.25');
    expect(result.total.toFixed(2)).toBe('1175.25');
  });

  test('rounds each statutory component to two decimal places deterministically', () => {
    const result = computeTaxComponents({
      taxableAmount: '99.99',
      treatment: 'standard',
      vatRate: '15',
      nhilRate: '2.5',
      getfundRate: '2.5',
    });

    expect(result.vatAmount.toFixed(2)).toBe('15.00');
    expect(result.nhilAmount.toFixed(2)).toBe('2.50');
    expect(result.getfundAmount.toFixed(2)).toBe('2.50');
    expect(result.tax.toFixed(2)).toBe('20.00');
    expect(result.total.toFixed(2)).toBe('119.99');
  });

  test('normalizes ISO currency codes without silently accepting malformed values', () => {
    expect(normalizeCurrency('ghs')).toBe('GHS');
    expect(normalizeCurrency('USD')).toBe('USD');
    expect(normalizeCurrency('not-money')).toBe('GHS');
  });

  test('uses debit normal balances for assets and expenses and credit for the rest', () => {
    expect(accountNormalSide('asset')).toBe('debit');
    expect(accountNormalSide('expense')).toBe('debit');
    expect(accountNormalSide('liability')).toBe('credit');
    expect(accountNormalSide('equity')).toBe('credit');
    expect(accountNormalSide('revenue')).toBe('credit');
  });

  test('accepts only positive balanced journal totals', () => {
    const balanced = [
      { debit: '1250.00', credit: '0.00' },
      { debit: '0.00', credit: '1000.00' },
      { debit: '0.00', credit: '250.00' },
    ];
    expect(journalTotals(balanced).debit.toFixed(2)).toBe('1250.00');
    expect(journalTotals(balanced).credit.toFixed(2)).toBe('1250.00');
    expect(isBalancedJournal(balanced)).toBe(true);
    expect(isBalancedJournal([
      { debit: '500.00', credit: '0.00' },
      { debit: '0.00', credit: '499.99' },
    ])).toBe(false);
    expect(isBalancedJournal([
      { debit: '0.00', credit: '0.00' },
      { debit: '0.00', credit: '0.00' },
    ])).toBe(false);
  });
});
