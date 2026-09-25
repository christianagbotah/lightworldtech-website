import { describe, expect, test } from 'bun:test';
import { deriveProposalReadiness } from './proposal-readiness';

const base = {
  status: 'review',
  title: 'Discovery & Solution Proposal',
  executiveSummary: 'A grounded executive summary.',
  solution: 'Recommended solution.',
  scope: 'Validated scope.',
  deliverables: JSON.stringify(['Discovery brief', 'Delivery roadmap']),
  assumptions: JSON.stringify(['Client stakeholders available']),
  timeline: 'Timeline subject to discovery validation.',
  commercialNotes: 'Commercial terms require authorized human approval.',
  nextSteps: 'Review and approve before sending.',
  approvedAt: null,
  sentAt: null,
  lead: {
    assignedTo: 'Account Owner',
    company: 'Client Co',
    serviceInterest: 'Enterprise software',
    budgetRange: 'GHS 50k-100k',
    expectedRevenue: 75000,
    deliveryWindow: 'Q4',
  },
};

describe('proposal readiness', () => {
  test('allows approval when core proposal evidence is complete', () => {
    const result = deriveProposalReadiness(base);
    expect(result.readyForApproval).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  test('blocks approval without an accountable CRM owner and core content', () => {
    const result = deriveProposalReadiness({
      ...base,
      scope: '',
      deliverables: '[]',
      lead: { ...base.lead, assignedTo: '' },
    });
    expect(result.readyForApproval).toBe(false);
    expect(result.blockers).toContain('scope / discovery plan');
    expect(result.blockers).toContain('deliverables');
    expect(result.blockers).toContain('accountable CRM owner');
  });

  test('surfaces qualification warnings without inventing commercial terms', () => {
    const result = deriveProposalReadiness({
      ...base,
      lead: {
        ...base.lead,
        company: '',
        serviceInterest: '',
        budgetRange: '',
        expectedRevenue: 0,
        deliveryWindow: '',
      },
    });
    expect(result.warnings).toContain('commercial value is not qualified');
    expect(result.controls).toContain('Pricing');
    expect(result.controls).toContain('human');
  });

  test('changes recommendation after approval and sending', () => {
    const approved = deriveProposalReadiness({ ...base, approvedAt: new Date('2026-09-25T10:00:00Z') });
    expect(approved.recommendedAction).toContain('approved');

    const sent = deriveProposalReadiness({ ...base, sentAt: new Date('2026-09-25T11:00:00Z') });
    expect(sent.recommendedAction).toContain('client feedback');
  });
});
