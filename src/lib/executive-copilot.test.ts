import { describe, expect, test } from 'bun:test';
import { deriveExecutiveCopilotBrief } from './executive-copilot';

const baseline = {
  canSite: true,
  canCrm: true,
  canFinance: true,
  canClients: true,
  isSuperAdmin: true,
  stats: {
    unreadMessages: 0,
    crm: { highPriority: 0, overdueFollowUps: 0 },
  },
  analytics: {
    assistantScopeSessions: 0,
    assistantLeadConversions: 0,
    estimatorSessions: 0,
    estimatorLeadConversions: 0,
  },
  health: {
    status: 'healthy' as const,
    disk: { status: 'healthy' as const, usedPercent: 42 },
    mail: { status: 'healthy' as const, configured: true },
    communications: { status: 'healthy' as const, automationEnabled: true },
  },
  backup: {
    status: 'healthy' as const,
    restoreVerification: { status: 'verified' as const },
  },
  portfolio: {
    summary: {
      interventionRequired: 0,
      overdueInvoices: 0,
      renewalsDue30: 0,
      atRiskProjects: 0,
      urgentTickets: 0,
      slaBreaches: 0,
    },
    data: [],
  },
};

describe('Executive Copilot prioritization', () => {
  test('ranks recovery and production-health evidence ahead of commercial work', () => {
    const result = deriveExecutiveCopilotBrief({
      ...baseline,
      backup: {
        status: 'attention' as const,
        restoreVerification: { status: 'stale' as const },
      },
      health: {
        ...baseline.health,
        status: 'attention' as const,
        disk: { status: 'attention' as const, usedPercent: 91 },
      },
      portfolio: {
        summary: { ...baseline.portfolio.summary, overdueInvoices: 4 },
        data: [],
      },
    });

    expect(result.actions.map((item) => item.id).slice(0, 3)).toEqual([
      'recovery-readiness',
      'system-health',
      'overdue-receivables',
    ]);
    expect(result.methodology).toContain('never changes financial records');
  });

  test('deep-links the highest-risk intervention account', () => {
    const result = deriveExecutiveCopilotBrief({
      ...baseline,
      portfolio: {
        summary: { ...baseline.portfolio.summary, interventionRequired: 2 },
        data: [
          { id: 'client-a', name: 'Client A', posture: 'intervention_required' as const, riskScore: 45 },
          { id: 'client-b', name: 'Client B', posture: 'intervention_required' as const, riskScore: 82 },
        ],
      },
    });

    const action = result.actions.find((item) => item.id === 'client-intervention');
    expect(action?.organizationId).toBe('client-b');
    expect(action?.detail).toContain('Client B');
  });

  test('does not invent material exceptions when evidence is healthy', () => {
    const result = deriveExecutiveCopilotBrief(baseline);
    expect(result.actions).toHaveLength(0);
    expect(result.summary).toContain('No material management exception');
  });
});