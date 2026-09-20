import { describe, expect, test } from 'bun:test';
import {
  careersApplicationMessage,
  careersApplicationSchema,
} from './careers-application';

describe('careers application input safety', () => {
  test('normalizes valid public application data', () => {
    const parsed = careersApplicationSchema.parse({
      name: '  Ama Mensah  ',
      email: ' AMA@example.com ',
      phone: '0240000000',
      position: 'Frontend Engineer',
      coverLetter: 'I build reliable products.',
      resumeUrl: 'https://example.com/ama-resume.pdf',
    });

    expect(parsed.name).toBe('Ama Mensah');
    expect(parsed.email).toBe('ama@example.com');
    expect(parsed.position).toBe('Frontend Engineer');
    expect(careersApplicationMessage(parsed)).toContain('Resume: https://example.com/ama-resume.pdf');
  });

  test('rejects malformed emails and header-style line breaks', () => {
    expect(careersApplicationSchema.safeParse({
      name: 'Attacker\r\nX-Test: yes',
      email: 'not-an-email',
      position: 'Engineer\nInjected',
    }).success).toBe(false);
  });

  test('bounds long public input', () => {
    expect(careersApplicationSchema.safeParse({
      name: 'Applicant',
      email: 'person@example.com',
      position: 'Engineer',
      coverLetter: 'x'.repeat(8001),
    }).success).toBe(false);
  });

  test('rejects unsafe resume URL schemes', () => {
    expect(careersApplicationSchema.safeParse({
      name: 'Applicant',
      email: 'person@example.com',
      position: 'Engineer',
      resumeUrl: 'javascript:alert(1)',
    }).success).toBe(false);
  });
});
