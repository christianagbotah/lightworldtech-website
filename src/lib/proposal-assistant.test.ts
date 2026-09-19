import { describe, expect, test } from 'bun:test';
import { generateProposalDraft } from './proposal-assistant';

describe('proposal assistant', () => {
  test('grounds capabilities in active CMS services and keeps commercial terms human-owned', () => {
    const result = generateProposalDraft({
      companyName: 'Lightworld Technologies Ltd',
      contactName: 'Prospective Client',
      subject: 'School management platform',
      message: 'We need a school management system for teachers, parents and administrators.',
      leadSummary: 'School management platform with role-based workflows and reporting.',
      tags: ['enterprise', 'education'],
      notes: [{ note: 'Discovery should confirm billing and assessment workflows.' }],
      services: [
        {
          title: 'Software Development',
          description: 'Custom business software and enterprise systems',
          features: '["Workflow automation","Reporting","Integrations"]',
        },
        {
          title: 'Skills Development',
          description: 'Technical training and enablement',
          features: '["Training","Workshops"]',
        },
      ],
    });

    expect(result.capabilities).toContain('Software Development');
    expect(result.problemStatement).toContain('billing and assessment workflows');
    expect(result.commercialNotes).toContain('Human review required');
    expect(result.exclusions.toLowerCase()).toContain('no price');
    expect(result.exclusions.toLowerCase()).toContain('no committed delivery date');
    expect(result.executiveSummary).toContain('not a quotation');
  });

  test('adds AI human-control discovery when AI is part of the lead', () => {
    const result = generateProposalDraft({
      companyName: 'Lightworld Technologies Ltd',
      contactName: 'Prospective Client',
      subject: 'AI workflow assistant',
      message: 'We want AI to help staff automate repetitive work.',
      leadSummary: 'AI-assisted workflow automation.',
      tags: ['ai', 'enterprise'],
      notes: [],
      services: [
        { title: 'Software Development', description: 'AI-enabled automation and software' },
      ],
    });

    expect(result.discoveryQuestions).toContain('human review or approval');
    expect(result.proposedSolution).toContain('Software Development');
  });

  test('does not invent certification claims or third-party inclusion', () => {
    const result = generateProposalDraft({
      companyName: 'Lightworld Technologies Ltd',
      contactName: 'Prospective Client',
      subject: 'Cloud platform',
      message: 'We need hosting and security improvements.',
      leadSummary: 'Cloud and security modernization.',
      tags: ['cloud', 'security'],
      notes: [],
      services: [
        { title: 'Hosting & Domain', description: 'Hosting and infrastructure' },
      ],
    });

    expect(result.exclusions.toLowerCase()).toContain('third-party');
    expect(result.exclusions.toLowerCase()).toContain('security certification');
    expect(result.exclusions.toLowerCase()).toContain('independently verified');
  });
});
