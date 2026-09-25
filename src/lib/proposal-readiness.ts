export type ProposalReadiness = {
  level: 'blocked' | 'review' | 'ready';
  readyForApproval: boolean;
  blockers: string[];
  warnings: string[];
  recommendedAction: string;
  controls: string;
};

type ProposalReadinessInput = {
  status: string;
  title: string;
  executiveSummary: string;
  solution: string;
  scope: string;
  deliverables: string;
  assumptions: string;
  timeline: string;
  commercialNotes: string;
  nextSteps: string;
  approvedAt: Date | null;
  sentAt: Date | null;
  lead: {
    assignedTo: string;
    company: string;
    serviceInterest: string;
    budgetRange: string;
    expectedRevenue: number;
    deliveryWindow: string;
  };
};

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter((item) => item.trim()) : [];
  } catch {
    return [];
  }
}

export function deriveProposalReadiness(input: ProposalReadinessInput): ProposalReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.title.trim()) blockers.push('proposal title');
  if (!input.executiveSummary.trim()) blockers.push('executive summary');
  if (!input.solution.trim()) blockers.push('recommended solution');
  if (!input.scope.trim()) blockers.push('scope / discovery plan');
  if (parseList(input.deliverables).length === 0) blockers.push('deliverables');
  if (!input.timeline.trim()) blockers.push('timeline');
  if (!input.commercialNotes.trim()) blockers.push('commercial notes');
  if (!input.nextSteps.trim()) blockers.push('next steps');
  if (!input.lead.assignedTo.trim()) blockers.push('accountable CRM owner');

  if (!input.lead.company.trim()) warnings.push('company / organization is not captured');
  if (!input.lead.serviceInterest.trim()) warnings.push('service interest is not structured');
  if (!input.lead.budgetRange.trim() && input.lead.expectedRevenue <= 0) warnings.push('commercial value is not qualified');
  if (!input.lead.deliveryWindow.trim()) warnings.push('delivery window is not qualified');
  if (parseList(input.assumptions).length === 0) warnings.push('assumptions and dependencies are empty');

  const readyForApproval = blockers.length === 0;
  let level: ProposalReadiness['level'] = readyForApproval ? 'ready' : 'blocked';
  if (readyForApproval && warnings.length > 0) level = 'review';

  let recommendedAction = readyForApproval
    ? 'Complete human review and approve the proposal when scope, commercial terms and delivery commitments are confirmed.'
    : 'Resolve approval blockers: ' + blockers.slice(0, 5).join(', ') + '.';

  if (input.sentAt) {
    recommendedAction = 'Track client feedback and keep any revised scope or commercial terms under a new human review cycle.';
  } else if (input.approvedAt) {
    recommendedAction = 'The proposal is approved; verify the intended recipient and send through the controlled client communication workflow.';
  }

  return {
    level,
    readyForApproval,
    blockers,
    warnings,
    recommendedAction,
    controls: 'Readiness is decision support only. Pricing, taxes, payment terms, scope commitments, approval and sending remain authorized human actions.',
  };
}
