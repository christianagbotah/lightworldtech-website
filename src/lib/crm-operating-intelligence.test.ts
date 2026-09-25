import { describe, expect, test } from 'bun:test';
import { deriveCrmOperatingIntelligence } from './crm-operating-intelligence';

const base = {
  status: 'discovery',
  priority: 'normal',
  assignedTo: 'Sales Owner',
  company: 'Client Co',
  industry: 'Manufacturing',
  countryRegion: 'Ghana',
  serviceInterest: 'Enterprise software',
  currency: 'GHS',
  budgetRange: 'GHS 50k–100k',
  deliveryWindow: 'Q4',
  engagementModel: 'Project',
  expectedRevenue: 75000,
  probability: 45,
  nextAction: 'Confirm scope',
  nextFollowUp: new Date('2026-09-27T10:00:00Z'),
  lastContactedAt: new Date('2026-09-24T10:00:00Z'),
  proposal: null,
  now: new Date('2026-09-25T10:00:00Z'),
};

describe('CRM operating intelligence', () => {
  test('prioritizes overdue follow-ups without taking autonomous action', () => {
    const result = deriveCrmOperatingIntelligence({
      ...base,
      nextFollowUp: new Date('2026-09-24T09:00:00Z'),
    });
    expect(result.urgency).toBe('critical');
    expect(result.recommendedAction).toContain('overdue follow-up');
    expect(result.controls).toContain('human-controlled');
  });

  test('identifies proposal-ready qualified opportunities', () => {
    const result = deriveCrmOperatingIntelligence({
      ...base,
      status: 'qualified',
      nextAction: 'Prepare proposal',
    });
    expect(result.readiness).toBe('proposal_ready');
    expect(result.recommendedAction).toContain('proposal workspace');
  });

  test('keeps draft proposals in human review', () => {
    const result = deriveCrmOperatingIntelligence({
      ...base,
      status: 'proposal',
      proposal: { status: 'draft', approvedAt: null, sentAt: null },
    });
    expect(result.readiness).toBe('proposal_in_progress');
    expect(result.recommendedAction).toContain('human approval');
  });

  test('surfaces missing discovery fields', () => {
    const result = deriveCrmOperatingIntelligence({
      ...base,
      assignedTo: '',
      serviceInterest: '',
      budgetRange: '',
      expectedRevenue: 0,
      deliveryWindow: '',
      nextAction: '',
    });
    expect(result.readiness).toBe('needs_discovery');
    expect(result.gaps).toContain('service interest');
    expect(result.gaps).toContain('commercial value');
    expect(result.gaps).toContain('delivery window');
    expect(result.gaps).toContain('owner');
  });

  test('treats won and lost opportunities as closed', () => {
    expect(deriveCrmOperatingIntelligence({ ...base, status: 'won' }).readiness).toBe('closed');
    expect(deriveCrmOperatingIntelligence({ ...base, status: 'lost' }).readiness).toBe('closed');
  });
});
