export type CrmOperatingIntelligence = {
  urgency: 'critical' | 'high' | 'normal' | 'low';
  readiness: 'closed' | 'needs_discovery' | 'proposal_ready' | 'proposal_in_progress' | 'follow_up' | 'closing';
  recommendedAction: string;
  rationale: string;
  gaps: string[];
  controls: string;
};

type LeadOperatingInput = {
  status: string;
  priority: string;
  assignedTo: string;
  company: string;
  industry: string;
  countryRegion: string;
  serviceInterest: string;
  currency: string;
  budgetRange: string;
  deliveryWindow: string;
  engagementModel: string;
  expectedRevenue: number;
  probability: number;
  nextAction: string;
  nextFollowUp: Date | null;
  lastContactedAt: Date | null;
  proposal?: { status: string; approvedAt: Date | null; sentAt: Date | null } | null;
  now?: Date;
};

export function deriveCrmOperatingIntelligence(input: LeadOperatingInput): CrmOperatingIntelligence {
  const now = input.now || new Date();
  const closed = ['won', 'lost'].includes(input.status);
  const overdue = Boolean(input.nextFollowUp && input.nextFollowUp.getTime() < now.getTime());
  const daysSinceContact = input.lastContactedAt
    ? Math.floor((now.getTime() - input.lastContactedAt.getTime()) / 86_400_000)
    : null;

  const gaps: string[] = [];
  if (!input.company.trim()) gaps.push('company');
  if (!input.serviceInterest.trim()) gaps.push('service interest');
  if (!input.industry.trim()) gaps.push('industry');
  if (!input.countryRegion.trim()) gaps.push('country / region');
  if (!input.budgetRange.trim() && input.expectedRevenue <= 0) gaps.push('commercial value');
  if (!input.deliveryWindow.trim()) gaps.push('delivery window');
  if (!input.engagementModel.trim()) gaps.push('engagement model');
  if (!input.assignedTo.trim()) gaps.push('owner');
  if (!input.nextAction.trim()) gaps.push('next action');

  if (closed) {
    return {
      urgency: 'low',
      readiness: 'closed',
      recommendedAction: input.status === 'won'
        ? 'Complete handoff into delivery and customer onboarding.'
        : 'Record the loss reason and any future re-engagement condition.',
      rationale: 'The opportunity is already in a terminal CRM stage.',
      gaps,
      controls: 'Decision support only. CRM ownership, outbound communication, pricing and proposal approval remain human-controlled.',
    };
  }

  const proposal = input.proposal || null;
  let readiness: CrmOperatingIntelligence['readiness'] = 'needs_discovery';
  if (input.status === 'negotiation') readiness = 'closing';
  else if (proposal) readiness = proposal.sentAt ? 'follow_up' : 'proposal_in_progress';
  else if (['proposal'].includes(input.status) || (['qualified', 'discovery'].includes(input.status) && gaps.filter((gap) => ['service interest', 'commercial value', 'delivery window', 'owner'].includes(gap)).length === 0)) {
    readiness = 'proposal_ready';
  } else if (['qualified', 'discovery'].includes(input.status)) {
    readiness = 'needs_discovery';
  } else {
    readiness = 'follow_up';
  }

  let urgency: CrmOperatingIntelligence['urgency'] = 'normal';
  if (overdue) urgency = 'critical';
  else if (input.priority === 'high' || (daysSinceContact !== null && daysSinceContact >= 7)) urgency = 'high';
  else if (input.priority === 'low') urgency = 'low';

  let recommendedAction = 'Review the opportunity and confirm the next human-owned action.';
  let rationale = 'The opportunity is active but no stronger deterministic operating rule applies.';

  if (overdue) {
    recommendedAction = 'Complete the overdue follow-up and record the outcome before advancing the stage.';
    rationale = 'The scheduled CRM follow-up time has passed while the opportunity remains open.';
  } else if (!input.assignedTo.trim()) {
    recommendedAction = 'Assign a responsible opportunity owner before further commercial progression.';
    rationale = 'The opportunity has no accountable owner.';
  } else if (readiness === 'closing') {
    recommendedAction = 'Confirm decision criteria, commercial objections and the next decision date.';
    rationale = 'The opportunity is in negotiation and should have a concrete human-owned closing plan.';
  } else if (proposal?.sentAt) {
    recommendedAction = 'Follow up on the sent proposal and record client feedback, objections and decision timing.';
    rationale = 'A proposal has already been sent and the next useful action is controlled follow-up.';
  } else if (proposal) {
    recommendedAction = 'Review the proposal draft, fill remaining evidence gaps and obtain human approval before sending.';
    rationale = 'A proposal workspace exists but has not been sent.';
  } else if (readiness === 'proposal_ready') {
    recommendedAction = 'Open the grounded proposal workspace and prepare a human-reviewed draft.';
    rationale = 'Core service, value, timing and ownership information is sufficiently populated for proposal drafting.';
  } else if (gaps.length) {
    recommendedAction = 'Run or complete discovery for: ' + gaps.slice(0, 4).join(', ') + '.';
    rationale = 'Important commercial qualification fields are still missing.';
  } else if (daysSinceContact === null) {
    recommendedAction = 'Make the first qualified follow-up and record the contact outcome.';
    rationale = 'No completed contact timestamp is recorded for the open opportunity.';
  } else if (daysSinceContact >= 4) {
    recommendedAction = 'Re-engage the opportunity and confirm whether timing, scope or priority has changed.';
    rationale = 'The opportunity has not recorded contact for ' + daysSinceContact + ' days.';
  } else if (!input.nextFollowUp) {
    recommendedAction = 'Set a dated next follow-up so the opportunity does not become owner-dependent memory.';
    rationale = 'There is no scheduled follow-up on this open opportunity.';
  }

  return {
    urgency,
    readiness,
    recommendedAction,
    rationale,
    gaps,
    controls: 'Decision support only. CRM ownership, outbound communication, pricing and proposal approval remain human-controlled.',
  };
}
