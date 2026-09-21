import { describe, expect, test } from 'bun:test';
import { normalizePhone, renderSmsTemplate, smsSegmentEstimate } from './hubtel-utils';

describe('Hubtel messaging utilities', () => {
  test('normalizes common Ghana phone-number formats', () => {
    expect(normalizePhone('024 361 8186')).toBe('233243618186');
    expect(normalizePhone('+233 24 361 8186')).toBe('233243618186');
    expect(normalizePhone('243618186')).toBe('233243618186');
  });

  test('rejects malformed phone numbers', () => {
    expect(() => normalizePhone('123')).toThrow('valid international number');
  });

  test('renders reusable SMS template variables without exposing placeholders', () => {
    expect(renderSmsTemplate(
      'Dear {{name}}, invoice {{invoice}} is due {{dueDate}}.',
      { name: 'Ama', invoice: 'INV-001', dueDate: '30 Sep 2026' },
    )).toBe('Dear Ama, invoice INV-001 is due 30 Sep 2026.');
  });

  test('estimates single and multipart SMS segment counts conservatively', () => {
    expect(smsSegmentEstimate('')).toBe(0);
    expect(smsSegmentEstimate('a'.repeat(160))).toBe(1);
    expect(smsSegmentEstimate('a'.repeat(161))).toBe(2);
    expect(smsSegmentEstimate('a'.repeat(306))).toBe(2);
    expect(smsSegmentEstimate('a'.repeat(307))).toBe(3);
  });
});
