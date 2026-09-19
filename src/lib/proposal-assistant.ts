export type ProposalService = {
  title: string;
  description?: string;
  features?: string;
};

export type ProposalGenerationInput = {
  companyName: string;
  contactName: string;
  subject: string;
  message: string;
  leadSummary: string;
  tags: string[];
  notes: Array<{ note: string }>;
  services: ProposalService[];
};

export type GeneratedProposalDraft = {
  title: string;
  executiveSummary: string;
  problemStatement: string;
  proposedSolution: string;
  capabilities: string;
  phases: string;
  assumptions: string;
  exclusions: string;
  discoveryQuestions: string;
  nextSteps: string;
  commercialNotes: string;
};

const tagMatchers: Record<string, RegExp> = {
  website: /web|website|digital experience|e-?commerce/i,
  mobile: /mobile|app|android|ios/i,
  enterprise: /software|enterprise|erp|system|workflow|automation/i,
  ai: /ai|artificial intelligence|automation|assistant|software/i,
  cloud: /cloud|hosting|devops|infrastructure|domain|server/i,
  security: /security|cyber|cloud|hosting/i,
  seo: /seo|marketing|social|growth/i,
  training: /training|skills|academy|consult/i,
  education: /software|training|skills|education/i,
  manufacturing: /software|enterprise|automation|system/i,
  logistics: /software|enterprise|automation|system/i,
};

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, limit: number): string {
  const cleaned = clean(value);
  if (cleaned.length <= limit) return cleaned;
  return cleaned.slice(0, Math.max(0, limit - 3)).trimEnd() + '...';
}

function bullet(items: string[]): string {
  return items.map((item) => '- ' + item).join('\n');
}

function parseFeatures(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map(clean).filter(Boolean);
  } catch {
    // Fall back to comma-delimited CMS content.
  }
  return value.split(',').map(clean).filter(Boolean);
}

function selectServices(tags: string[], services: ProposalService[]): ProposalService[] {
  const selected: ProposalService[] = [];

  for (const tag of tags) {
    const matcher = tagMatchers[tag.toLowerCase()];
    if (!matcher) continue;

    for (const service of services) {
      const haystack = [
        service.title,
        service.description || '',
        ...parseFeatures(service.features),
      ].join(' ');
      if (matcher.test(haystack) && !selected.some((item) => item.title === service.title)) {
        selected.push(service);
      }
      if (selected.length >= 4) break;
    }
    if (selected.length >= 4) break;
  }

  if (selected.length === 0) {
    const fallback = services.find((service) => /software|web|technology|consult/i.test(service.title));
    if (fallback) selected.push(fallback);
  }

  return selected.slice(0, 4);
}

function discoveryQuestions(tags: string[]): string[] {
  const questions = [
    'What is the single most important business outcome this project must achieve?',
    'Who are the primary users, approvers and internal project owner?',
    'Which existing systems, data sources or manual processes must be replaced or integrated?',
    'What information must be migrated, retained or reported, and who owns that data?',
    'Are there security, access-control, audit, hosting or data-residency requirements we must design around?',
    'What budget range has been allocated, if one exists, and what commercial constraints should the team know?',
    'Is there a fixed business deadline, dependency or launch event that must be validated during discovery?',
  ];

  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if (tagSet.has('website')) {
    questions.push('Who owns website content, brand assets, SEO requirements and ongoing publishing after launch?');
  }
  if (tagSet.has('mobile')) {
    questions.push('Which mobile platforms, device constraints, offline scenarios and app-store requirements matter?');
  }
  if (tagSet.has('enterprise') || tagSet.has('manufacturing') || tagSet.has('logistics')) {
    questions.push('Which roles, approvals, branches/sites and operational workflows must the system enforce?');
  }
  if (tagSet.has('education')) {
    questions.push('Which school roles, campuses/classes, assessment, billing or parent/student journeys are in scope?');
  }
  if (tagSet.has('ai')) {
    questions.push('Which decisions or repetitive tasks may AI assist, and where must a human review or approval remain mandatory?');
  }
  if (tagSet.has('cloud') || tagSet.has('security')) {
    questions.push('What infrastructure exists today, and what backup, recovery, monitoring and privileged-access expectations apply?');
  }

  return [...new Set(questions)].slice(0, 10);
}

export function generateProposalDraft(input: ProposalGenerationInput): GeneratedProposalDraft {
  const companyName = clean(input.companyName) || 'Lightworld Technologies Ltd';
  const contactName = clean(input.contactName) || 'the prospective client';
  const subject = clean(input.subject);
  const summary = truncate(input.leadSummary || input.message, 520);
  const selectedServices = selectServices(input.tags, input.services);

  const capabilityLines = selectedServices.length
    ? selectedServices.map((service) => {
        const features = parseFeatures(service.features).slice(0, 3);
        return features.length
          ? service.title + ' — ' + features.join(', ')
          : service.title;
      })
    : [
        'Discovery and solution architecture',
        'Product / software engineering',
        'Implementation, testing and launch support',
      ];

  const latestNotes = input.notes
    .map((item) => truncate(item.note, 220))
    .filter(Boolean)
    .slice(0, 3);

  const contextSuffix = latestNotes.length
    ? ' Internal CRM context also records: ' + latestNotes.join(' | ') + '.'
    : '';

  const problemStatement = summary ||
    'The exact problem statement must be confirmed with the prospective client during discovery.';

  const solutionServices = selectedServices.map((service) => service.title);
  const solutionPhrase = solutionServices.length
    ? solutionServices.join(', ')
    : 'the appropriate Lightworld delivery capabilities';

  const titleSeed = subject || input.tags.slice(0, 2).join(' / ') || 'Digital Solution';
  const title = 'Proposal Draft — ' + truncate(titleSeed, 110);

  return {
    title,
    executiveSummary:
      companyName +
      ' has prepared this internal proposal draft for ' +
      contactName +
      ' based on the current enquiry and CRM context. The working objective is to validate the problem, confirm the users and operational constraints, and shape a production-ready delivery approach before commercial commitments are made. This document requires human review and is not a quotation, contract, price commitment or delivery-date commitment.',
    problemStatement: problemStatement + contextSuffix,
    proposedSolution:
      'Begin with structured discovery to validate requirements and success measures, then shape the solution around ' +
      solutionPhrase +
      '. Delivery should be broken into reviewable increments with architecture, user experience, security, integrations, data, testing, deployment and adoption considered together. Final modules and technical choices must be confirmed after discovery rather than inferred from this draft alone.',
    capabilities: bullet(capabilityLines),
    phases: bullet([
      'Discovery & validation — confirm business outcomes, users, workflows, constraints, integrations, data and measurable acceptance criteria.',
      'Solution design — agree scope, user journeys, architecture, security/access model, data flows and implementation plan.',
      'Engineering & integration — build the approved scope in testable increments with reviews, quality checks and documented decisions.',
      'UAT, launch & enablement — validate with users, resolve launch blockers, prepare deployment, documentation, training and handover.',
    ]),
    assumptions: bullet([
      'The prospective client will nominate decision-makers and subject-matter experts for discovery and review.',
      'Required content, data, credentials, integration documentation and third-party access will be provided through agreed secure channels.',
      'Final scope, architecture, hosting, integrations, migration approach and acceptance criteria remain subject to discovery.',
      'Any regulatory, industry or internal policy requirements must be identified and validated with the appropriate client stakeholders.',
    ]),
    exclusions: bullet([
      'No price, fee, payment schedule or commercial commitment is generated automatically; an authorized Lightworld reviewer must provide these.',
      'No committed delivery date or project duration is generated automatically; milestones depend on validated scope, dependencies and resourcing.',
      'Third-party licences, cloud usage, messaging, payment, marketplace or vendor charges are excluded unless explicitly added by a human reviewer.',
      'This draft does not claim legal compliance, security certification or third-party accreditation that has not been independently verified and explicitly agreed.',
      'Items not validated during discovery or written into the approved scope are not automatically included.',
    ]),
    discoveryQuestions: bullet(discoveryQuestions(input.tags)),
    nextSteps: bullet([
      'Review this draft internally and correct any assumption that is not supported by the enquiry or CRM notes.',
      'Schedule a discovery conversation with the prospective client and capture unresolved requirements and decision criteria.',
      'Confirm the approved solution scope, deliverables, dependencies, responsibilities and acceptance criteria.',
      'Add human-approved commercial terms, pricing and realistic milestones before issuing any proposal externally.',
    ]),
    commercialNotes:
      'Human review required. Add approved pricing, payment terms, commercial validity, delivery assumptions and contractual notes here. Do not send this proposal externally until an authorized Lightworld reviewer has approved it.',
  };
}
