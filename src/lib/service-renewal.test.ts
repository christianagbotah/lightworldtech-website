import { describe, expect, test } from 'bun:test';
import {
  advanceBillingDate,
  calculateRenewedServiceDates,
  supportsAutomaticRenewalCycle,
} from '@/lib/service-renewal';

describe('service renewal date calculations', () => {
  test('clamps month-end dates instead of overflowing', () => {
    expect(advanceBillingDate(new Date('2026-01-31T00:00:00.000Z'), 'monthly').toISOString())
      .toBe('2026-02-28T00:00:00.000Z');
  });

  test('advances annual service dates from the billed renewal cycle', () => {
    const result = calculateRenewedServiceDates({
      renewalForDate: new Date('2026-10-01T00:00:00.000Z'),
      billingCycle: 'annual',
      currentExpiryDate: new Date('2026-10-15T00:00:00.000Z'),
      currentNextDueDate: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(result.nextDueDate.toISOString()).toBe('2027-10-01T00:00:00.000Z');
    expect(result.expiryDate.toISOString()).toBe('2027-10-15T00:00:00.000Z');
  });

  test('catches an old expiry date up to the next valid cycle', () => {
    const result = calculateRenewedServiceDates({
      renewalForDate: new Date('2026-10-01T00:00:00.000Z'),
      billingCycle: 'annual',
      currentExpiryDate: new Date('2024-10-15T00:00:00.000Z'),
      currentNextDueDate: new Date('2024-10-01T00:00:00.000Z'),
    });
    expect(result.expiryDate.toISOString()).toBe('2027-10-15T00:00:00.000Z');
    expect(result.nextDueDate.toISOString()).toBe('2027-10-01T00:00:00.000Z');
  });

  test('requires manual dates for custom and one-time cycles', () => {
    expect(supportsAutomaticRenewalCycle('custom')).toBe(false);
    expect(supportsAutomaticRenewalCycle('one_time')).toBe(false);
  });
});
