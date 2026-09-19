import { describe, expect, test } from 'bun:test';
import { deriveLeadIntelligence } from './lead-intelligence';

describe('lead intelligence', () => {
  test('detects assistant-sourced enterprise education work', () => {
    const result = deriveLeadIntelligence({
      subject: 'Project brief from Lightworld Assistant',
      message: 'We need a school management ERP with AI automation for teachers and parents.',
    });

    expect(result.source).toBe('assistant');
    expect(result.tags).toContain('enterprise');
    expect(result.tags).toContain('education');
    expect(result.tags).toContain('ai');
  });

  test('raises explicit urgent enquiries to high priority', () => {
    const result = deriveLeadIntelligence({
      subject: 'Urgent website rebuild',
      message: 'We need the new website this week.',
    });

    expect(result.priority).toBe('high');
    expect(result.tags).toContain('website');
  });

  test('keeps exploratory enquiries low priority and provides a concise summary', () => {
    const result = deriveLeadIntelligence({
      subject: 'Exploring cloud options',
      message: 'We are researching hosting and cloud infrastructure with no fixed deadline yet.',
    });

    expect(result.priority).toBe('low');
    expect(result.tags).toContain('cloud');
    expect(result.summary.length).toBeLessThanOrEqual(280);
  });
});
