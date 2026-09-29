export type ExecutiveCopilotTarget =
  | 'clients'
  | 'collections'
  | 'renewals'
  | 'support'
  | 'crm'
  | 'messages'
  | 'settings'
  | 'recovery'
  | 'analytics';

export type ExecutiveCopilotAction = {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'opportunity';
  score: number;
  title: string;
  detail: string;
  evidence: string;
  target: ExecutiveCopilotTarget;
  organizationId?: string;
};

type CopilotInput = {
  canSite: boolean;
  canCrm: boolean;
  canFinance: boolean;
  canClients: boolean;
  isSuperAdmin: boolean;
  stats: {
    unreadMessages: number;
    crm: { highPriority: number; overdueFollowUps: number };
  } | null;
  analytics: {
    assistantScopeSessions: number;
    assistantLeadConversions: number;
    estimatorSessions: number;
    estimatorLeadConversions: number;
  } | null;
  health: {
    status: 'healthy' | 'attention';
    disk?: { status: 'healthy' | 'attention'; usedPercent: number };
    mail?: { status: 'healthy' | 'attention'; configured: boolean };
    communications?: { status: 'healthy' | 'attention'; automationEnabled: boolean };
  } | null;
  backup: {
    status: 'healthy' | 'attention' | 'missing';
    restoreVerification?: { status: 'verified' | 'stale' | 'failed' | 'not_verified' };
  } | null;
  portfolio: {
    summary: {
      interventionRequired: number;
      overdueInvoices: number;
      renewalsDue30: number;
      atRiskProjects: number;
      urgentTickets: number;
      slaBreaches: number;
    };
    data: Array<{
      id: string;
      name: string;
      posture: 'intervention_required' | 'attention' | 'stable';
      riskScore: number;
    }>;
  } | null;
};

function priorityFor(score: number): ExecutiveCopilotAction['priority'] {
  if (score >= 95) return 'critical';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'opportunity';
}

export function deriveExecutiveCopilotBrief(input: CopilotInput) {
  const actions: ExecutiveCopilotAction[] = [];
  const add = (action: Omit<ExecutiveCopilotAction, 'priority'>) => {
    actions.push({ ...action, priority: priorityFor(action.score) });
  };

  if (input.isSuperAdmin && input.backup && input.backup.status !== 'healthy') {
    add({
      id: 'recovery-readiness',
      score: 99,
      title: 'Restore recovery confidence',
      detail: 'Backup or restore verification is not currently healthy.',
      evidence: `Backup ${input.backup.status} · restore ${input.backup.restoreVerification?.status || 'unknown'}`,
      target: 'recovery',
    });
  }

  if (input.health?.status === 'attention') {
    const concerns = [
      input.health.disk?.status === 'attention' ? `disk ${input.health.disk.usedPercent}% used` : '',
      input.health.mail?.status === 'attention' ? 'mail needs attention' : '',
      input.health.communications?.status === 'attention' ? 'communications automation needs attention' : '',
    ].filter(Boolean);
    add({
      id: 'system-health',
      score: 97,
      title: 'Clear production health exceptions',
      detail: 'One or more production operating signals need administrator review.',
      evidence: concerns.join(' · ') || 'System health status is attention',
      target: 'settings',
    });
  }

  if (input.canFinance && input.portfolio?.summary.interventionRequired) {
    const account = input.portfolio.data
      .filter((item) => item.posture === 'intervention_required')
      .sort((a, b) => b.riskScore - a.riskScore)[0];
    add({
      id: 'client-intervention',
      score: 96,
      title: 'Review highest-risk client account',
      detail: account ? `${account.name} is the highest-scored account requiring intervention.` : 'Client accounts require management intervention.',
      evidence: `${input.portfolio.summary.interventionRequired} intervention account(s)`,
      target: 'clients',
      organizationId: account?.id,
    });
  }

  if (input.canFinance && input.portfolio?.summary.overdueInvoices) {
    add({
      id: 'overdue-receivables',
      score: 93,
      title: 'Advance overdue collections',
      detail: 'Open the governed collections queue and work the oldest or highest-risk receivables.',
      evidence: `${input.portfolio.summary.overdueInvoices} overdue invoice(s)`,
      target: 'collections',
    });
  }

  const operationalRisk = input.portfolio
    ? input.portfolio.summary.atRiskProjects + input.portfolio.summary.slaBreaches + input.portfolio.summary.urgentTickets
    : 0;
  if ((input.canFinance || input.canClients) && operationalRisk > 0) {
    add({
      id: 'delivery-support-risk',
      score: 90,
      title: 'Resolve delivery and support pressure',
      detail: 'At-risk delivery or urgent support conditions need operational ownership.',
      evidence: `${input.portfolio?.summary.atRiskProjects || 0} project risk · ${input.portfolio?.summary.slaBreaches || 0} SLA breach · ${input.portfolio?.summary.urgentTickets || 0} urgent ticket`,
      target: 'support',
    });
  }

  if (input.canFinance && input.portfolio?.summary.renewalsDue30) {
    add({
      id: 'renewals-due',
      score: 84,
      title: 'Protect upcoming renewals',
      detail: 'Review renewal readiness, billing evidence and customer communication before due dates.',
      evidence: `${input.portfolio.summary.renewalsDue30} renewal(s) due within 30 days`,
      target: 'renewals',
    });
  }

  if (input.canCrm && input.stats?.crm.overdueFollowUps) {
    add({
      id: 'crm-overdue-followups',
      score: 82,
      title: 'Clear overdue CRM follow-ups',
      detail: 'Return qualified prospects to an owned next action instead of leaving follow-ups stale.',
      evidence: `${input.stats.crm.overdueFollowUps} overdue follow-up(s)`,
      target: 'crm',
    });
  }

  if (input.canCrm && input.stats?.crm.highPriority) {
    add({
      id: 'crm-high-priority',
      score: 72,
      title: 'Review high-priority opportunities',
      detail: 'Check qualification, next action and proposal readiness for priority leads.',
      evidence: `${input.stats.crm.highPriority} high-priority lead(s)`,
      target: 'crm',
    });
  }

  if (input.canCrm && input.stats?.unreadMessages) {
    add({
      id: 'unread-enquiries',
      score: 64,
      title: 'Respond to unread enquiries',
      detail: 'Convert genuine new enquiries into owned CRM work without losing context.',
      evidence: `${input.stats.unreadMessages} unread message(s)`,
      target: 'messages',
    });
  }

  const assistedSessions = input.analytics?.assistantScopeSessions || 0;
  const assistedLeads = input.analytics?.assistantLeadConversions || 0;
  if (input.canSite && assistedSessions > 0 && assistedLeads === 0) {
    add({
      id: 'assistant-conversion',
      score: 48,
      title: 'Inspect assisted lead conversion',
      detail: 'Visitors have completed AI-assisted scoping but none converted to a recorded lead in the selected analytics window.',
      evidence: `${assistedSessions} scoped session(s) · 0 recorded lead conversions`,
      target: 'analytics',
    });
  }

  actions.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const top = actions.slice(0, 5);
  const material = top.filter((item) => item.priority !== 'opportunity').length;
  const summary = material
    ? `${material} management priorit${material === 1 ? 'y' : 'ies'} surfaced from current operating evidence.`
    : 'No material management exception is currently surfaced by the available evidence.';

  return {
    generatedAt: new Date().toISOString(),
    summary,
    actions: top,
    methodology:
      'Evidence-grounded prioritization only: persisted CRM, client, finance, support and production signals are ranked deterministically. The Copilot never changes financial records, client status or workflow state automatically.',
  };
}