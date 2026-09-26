export type SupportTicketPriority = 'low' | 'normal' | 'high';

const SLA_HOURS: Record<SupportTicketPriority, { firstResponse: number; resolution: number }> = {
  high: { firstResponse: 2, resolution: 24 },
  normal: { firstResponse: 8, resolution: 72 },
  low: { firstResponse: 24, resolution: 120 },
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function supportSla(priority: SupportTicketPriority, createdAt = new Date()) {
  const policy = SLA_HOURS[priority];
  return {
    firstResponseDueAt: addHours(createdAt, policy.firstResponse),
    resolutionDueAt: addHours(createdAt, policy.resolution),
  };
}

export function supportSlaState(ticket: {
  status: string;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
}, now = new Date()) {
  const closed = ticket.status === 'closed' || ticket.status === 'resolved';
  const firstResponseBreached =
    !ticket.firstRespondedAt &&
    Boolean(ticket.firstResponseDueAt && ticket.firstResponseDueAt.getTime() < now.getTime());
  const resolutionBreached =
    !closed &&
    Boolean(ticket.resolutionDueAt && ticket.resolutionDueAt.getTime() < now.getTime());

  return {
    firstResponseBreached,
    resolutionBreached,
    breached: firstResponseBreached || resolutionBreached,
  };
}
