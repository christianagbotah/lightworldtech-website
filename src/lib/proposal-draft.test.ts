import { describe, expect, test } from 'bun:test';
import { generateProposalDraft } from './proposal-draft';

describe('proposal draft generator', () => {
  test('grounds the draft in lead facts and relevant capabilities', () => {
    const draft = generateProposalDraft({
      lead: {
        summary: 'School platform: Replace manual administration and improve reporting.',
        tags: ['enterprise', 'education', 'ai'],
        source: 'assistant',
        priority: 'high',
        company: 'Example Academy',
        industry: 'Education',
        countryRegion: 'Ghana',
        serviceInterest: 'School management platform',
        currency: 'GHS',
        budgetRange: '50,000-80,000',
        deliveryWindow: 'Within 1-3 months',
        engagementModel: 'Phased implementation',
        international: false,
      },
      contact: {
        name: 'Example School',
        subject: 'School platform',
        message: 'We need a school management platform for staff, parents and students within 1-3 months.',
      },
    });

    expect(draft.title).toContain('School platform');
    expect(draft.executiveSummary).toContain('Replace manual administration');
    expect(draft.executiveSummary).toContain('organization: Example Academy');
    expect(draft.executiveSummary).toContain('service interest: School management platform');
    expect(draft.executiveSummary).toContain('industry: Education');
    expect(draft.executiveSummary).toContain('country / region: Ghana');
    expect(draft.executiveSummary).toContain('budget context: GHS 50,000-80,000');
    expect(draft.solution).toContain('recorded service interest is School management platform');
    expect(draft.solution).toContain('enterprise software');
    expect(draft.solution).toContain('education technology');
    expect(draft.timeline).toContain('Within 1-3 months');
    expect(draft.timeline).toContain('CRM qualification');
    expect(draft.timeline.toLowerCase()).toContain('not a committed delivery date');
    expect(draft.commercialNotes).toContain('GHS 50,000-80,000');
    expect(draft.commercialNotes.toLowerCase()).toContain('not a lightworld quote');
  });

  test('prefers structured CRM qualification over unstructured timing text without turning it into a commitment', () => {
    const draft = generateProposalDraft({
      lead: {
        summary: 'Enterprise workflow modernization.',
        tags: ['enterprise'],
        source: 'website',
        priority: 'normal',
        company: 'Example Manufacturing Ltd',
        industry: 'Manufacturing',
        countryRegion: 'Ghana',
        serviceInterest: 'Enterprise workflow automation',
        deliveryWindow: 'Q1 2027',
        engagementModel: 'Discovery then phased delivery',
        international: false,
      },
      contact: {
        name: 'Ama Example',
        subject: 'Workflow modernization',
        message: 'We are exploring options and have not agreed a delivery date.',
      },
    });

    expect(draft.executiveSummary).toContain('Example Manufacturing Ltd');
    expect(draft.executiveSummary).toContain('Discovery then phased delivery');
    expect(draft.timeline).toContain('Q1 2027');
    expect(draft.timeline).not.toContain('have not agreed a delivery date');
    expect(draft.assumptions.join(' ')).toContain('CRM qualification fields');
  });

  test('never invents commercial terms or binding dates', () => {
    const draft = generateProposalDraft({
      lead: {
        summary: 'Website redesign with no fixed deadline.',
        tags: ['website'],
        source: 'website',
        priority: 'low',
      },
      contact: {
        name: 'Example Company',
        subject: 'Website redesign',
        message: 'We are exploring a website redesign with no fixed deadline.',
      },
    });

    expect(draft.commercialNotes.toLowerCase()).toContain('not auto-generated');
    expect(draft.commercialNotes.toLowerCase()).toContain('human');
    expect(draft.assumptions.join(' ').toLowerCase()).toContain('pricing');
    expect(draft.timeline.toLowerCase()).toContain('not a committed delivery date');
    expect(JSON.stringify(draft)).not.toMatch(/GHS\s*\d|USD\s*\d|\$\d/);
  });

  test('uses neutral discovery language when no known capability tag exists', () => {
    const draft = generateProposalDraft({
      lead: {
        summary: 'General technology enquiry.',
        tags: ['general'],
        source: 'website',
        priority: 'normal',
      },
      contact: {
        name: 'Prospect',
        subject: '',
        message: 'We would like to discuss a technology project.',
      },
    });

    expect(draft.solution).toContain('product design, software engineering and delivery planning');
    expect(draft.deliverables.length).toBeGreaterThanOrEqual(5);
    expect(draft.assumptions.length).toBeGreaterThanOrEqual(4);
  });
});
