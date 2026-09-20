import { describe, expect, test } from 'bun:test';
import { normalizeWhatsappNumber } from './contact-content';

describe('normalizeWhatsappNumber', () => {
  test('normalizes Ghana local and international display formats', () => {
    expect(normalizeWhatsappNumber('024 361 8186')).toBe('233243618186');
    expect(normalizeWhatsappNumber('+233 24 361 8186')).toBe('233243618186');
    expect(normalizeWhatsappNumber('+233 (024) 361 8186')).toBe('233243618186');
    expect(normalizeWhatsappNumber('2330243618186')).toBe('233243618186');
  });

  test('keeps already-normalized international numbers stable', () => {
    expect(normalizeWhatsappNumber('233243618186')).toBe('233243618186');
  });

  test('returns an empty value for unusable input', () => {
    expect(normalizeWhatsappNumber('')).toBe('');
    expect(normalizeWhatsappNumber(null)).toBe('');
  });
});
