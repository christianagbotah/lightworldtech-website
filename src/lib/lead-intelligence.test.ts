import { describe, expect, test } from 'bun:test';
import { qualifyLead } from './lead-intelligence';

describe('lead qualification', () => {
  test('identifies a detailed enterprise lead as high priority', () => {
    const result = qualifyLead({
      name: 'Operations Director',
      email: 'ops@example.com',
      phone: '+233240000000',
      subject: 'ERP proposal for our factory',
      message: 'Our company has multiple departments and we need an enterprise inventory and workflow system within 1-3 months. Please send a proposal and quotation.',
    });

    expect(result.category).toBe('Enterprise Software');
    expect(result.priority).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  test('routes AI automation enquiries correctly', () => {
    const result = qualifyLead({
      subject: 'AI workflow',
      message: 'We want to automate repetitive customer-support work with an AI assistant.',
    });

    expect(result.category).toBe('AI & Automation');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test('keeps a vague general enquiry conservative', () => {
    const result = qualifyLead({ message: 'Please tell me more about your company.' });
    expect(result.category).toBe('General');
    expect(result.priority).toBe('normal');
    expect(result.score).toBeLessThan(55);
  });
});
