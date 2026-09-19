export type ProposalDraftInput = {
  lead: {
    summary: string;
    tags: string[];
    source: string;
    priority: 'low' | 'normal' | 'high' | string;
  };
  contact: {
    name: string;
    subject: string;
    message: string;
  };
};

export type ProposalDraft = {
  title: string;
  executiveSummary: string;
  solution: string;
  scope: string;
  deliverables: string[];
  assumptions: string[];
  timeline: string;
  commercialNotes: string;
  nextSteps: string;
};

const capabilityByTag: Record<string, string> = {
  website: 'web and product engineering',
  mobile: 'mobile application engineering',
  enterprise: 'enterprise software and workflow engineering',
  ai: 'AI-assisted workflows and automation',
  cloud: 'cloud, hosting and DevOps engineering',
  security: 'security-focused application and access-control engineering',
  seo: 'SEO and digital growth support',
  training: 'skills development and technical training',
  education: 'education technology and institutional workflows',
  manufacturing: 'manufacturing and operational technology workflows',
  logistics: 'logistics, fleet and operational workflow systems',
};

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function titleCaseFirst(value: string): string {
  const v = clean(value);
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

function prospectTimeline(message: string): string {
  const text = clean(message);
  const patterns = [
    /within\s+\d+\s*[-–]\s*\d+\s+(?:weeks?|months?)/i,
    /within\s+(?:a|one|two|three|four|five|six)\s+(?:week|month)s?/i,
    /as soon as practical/i,
    /as soon as possible|\basap\b/i,
    /no fixed deadline(?: yet)?/i,
    /by\s+(?:the\s+)?end\s+of\s+[a-z]+/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return 'Target window stated by the prospect: ' + match[0] + '. This is not a committed delivery date until scope and dependencies are validated.';
  }

  return 'Delivery timing should be confirmed during discovery after scope, integrations, stakeholders and dependencies are validated.';
}

export function generateProposalDraft(input: ProposalDraftInput): ProposalDraft {
  const subject = clean(input.contact.subject);
  const summary = clean(input.lead.summary || input.contact.message);
  const tags = [...new Set(input.lead.tags.map((tag) => clean(tag).toLowerCase()).filter(Boolean))];
  const capabilities = tags.map((tag) => capabilityByTag[tag]).filter(Boolean);
  const capabilityText = capabilities.length
    ? capabilities.slice(0, 4).join(', ')
    : 'product design, software engineering and delivery planning';

  const title = 'Discovery & Solution Proposal — ' + (subject || input.contact.name || 'Technology Project');

  const executiveSummary =
    'This draft translates the enquiry from ' + input.contact.name +
    ' into a structured starting point for discovery. The current need is summarized as: ' +
    summary +
    ' The purpose of the next stage is to validate the problem, users, workflows, constraints and success measures before Lightworld Technologies Ltd makes final commercial or delivery commitments.';

  const solution =
    'Lightworld proposes a discovery-led engagement using ' + capabilityText +
    '. The team would first validate requirements and operating context, then define the appropriate experience, system boundaries, integrations, security considerations and implementation approach. Any final architecture or module list remains subject to discovery findings.';

  const scope = [
    'Clarify the business outcome and measurable success criteria.',
    'Map primary users, roles, workflows and approval paths.',
    'Confirm functional requirements, integrations, data and reporting needs.',
    'Identify security, access-control, deployment and operational constraints.',
    'Define the recommended solution shape, delivery phases and acceptance approach.',
  ].join('\n');

  const deliverables = [
    'Validated discovery brief and problem statement',
    'User, workflow and requirements map',
    'Recommended solution architecture and delivery approach',
    'Prioritized scope with phased implementation roadmap',
    'Risks, dependencies, assumptions and open decisions',
    'Commercial estimate and committed delivery plan after human review',
  ];

  const assumptions = [
    'Client stakeholders and subject-matter experts will be available for discovery and validation.',
    'Required information about current processes, systems, integrations and constraints will be shared where applicable.',
    'Third-party licenses, infrastructure, data migration and external integrations will be confirmed before final commercial commitments.',
    'Scope, pricing, payment terms and committed delivery dates require explicit human approval from Lightworld Technologies Ltd.',
  ];

  const commercialNotes =
    'Commercial terms are intentionally not auto-generated. Pricing, taxes, payment milestones, validity period, support terms and any binding delivery dates must be entered and approved through human review by an authorized Lightworld representative.';

  const nextSteps =
    'Review this draft with the prospect, confirm the decision-makers and discovery participants, resolve open scope questions, then prepare the final commercial proposal for authorized approval before it is sent.';

  return {
    title: titleCaseFirst(title),
    executiveSummary,
    solution,
    scope,
    deliverables,
    assumptions,
    timeline: prospectTimeline(input.contact.message),
    commercialNotes,
    nextSteps,
  };
}
