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
      },
      contact: {
        name: 'Example School',
        subject: 'School platform',
        message: 'We need a school management platform for staff, parents and students within 1-3 months.',
      },
    });

    expect(draft.title).toContain('School platform');
    expect(draft.executiveSummary).toContain('Replace manual administration');
    expect(draft.solution).toContain('enterprise software');
    expect(draft.solution).toContain('education technology');
    expect(draft.timeline).toContain('within 1-3 months');
    expect(draft.timeline.toLowerCase()).toContain('not a committed delivery date');
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
