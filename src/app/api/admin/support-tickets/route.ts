import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { reconcileSupportEscalations, supportSlaState } from '@/lib/support-ticket';

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await reconcileSupportEscalations();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const category = searchParams.get('category')?.trim();
    const assignedTo = searchParams.get('assignedTo')?.trim();
    const sla = searchParams.get('sla')?.trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 100)));
    const now = new Date();
    const configuredWarningMinutes = Number(process.env.SUPPORT_SLA_WARNING_MINUTES || 60);
    const warningMinutes = Math.max(5, Math.min(1440, Number.isFinite(configuredWarningMinutes) ? configuredWarningMinutes : 60));
    const warningHorizon = new Date(now.getTime() + warningMinutes * 60_000);

    const where: Prisma.ClientSupportTicketWhereInput = {};
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (category && category !== 'all') where.category = category;
    if (assignedTo && assignedTo !== 'all') {
      where.assignedTo = assignedTo === 'unassigned' ? '' : assignedTo;
    }
    if (sla === 'breached') {
      where.OR = [
        { firstRespondedAt: null, firstResponseDueAt: { lt: now } },
        { status: { notIn: ['resolved', 'closed'] }, resolutionDueAt: { lt: now } },
      ];
    } else if (sla === 'at_risk') {
      where.OR = [
        {
          firstRespondedAt: null,
          firstResponseDueAt: { gte: now, lte: warningHorizon },
          status: { notIn: ['resolved', 'closed'] },
        },
        {
          resolutionDueAt: { gte: now, lte: warningHorizon },
          status: { notIn: ['resolved', 'closed'] },
        },
      ];
    }
    if (q) {
      const searchOr: Prisma.ClientSupportTicketWhereInput[] = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { assignedTo: { contains: q, mode: 'insensitive' } },
        { organization: { name: { contains: q, mode: 'insensitive' } } },
        { createdBy: { name: { contains: q, mode: 'insensitive' } } },
        { createdBy: { email: { contains: q, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const breachWhere: Prisma.ClientSupportTicketWhereInput = {
      OR: [
        { firstRespondedAt: null, firstResponseDueAt: { lt: now } },
        { status: { notIn: ['resolved', 'closed'] }, resolutionDueAt: { lt: now } },
      ],
    };

    const atRiskWhere: Prisma.ClientSupportTicketWhereInput = {
      status: { notIn: ['resolved', 'closed'] },
      OR: [
        { firstRespondedAt: null, firstResponseDueAt: { gte: now, lte: warningHorizon } },
        { resolutionDueAt: { gte: now, lte: warningHorizon } },
      ],
    };

    const performanceSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [tickets, total, open, unread, highPriority, breached, atRisk, awaitingClient, performanceTickets] = await Promise.all([
      db.clientSupportTicket.findMany({
        where,
        take: limit,
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          organization: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true, internalNotes: true } },
        },
      }),
      db.clientSupportTicket.count({ where }),
      db.clientSupportTicket.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
      db.clientSupportTicket.count({ where: { unreadByAdmin: true } }),
      db.clientSupportTicket.count({
        where: { priority: 'high', status: { notIn: ['resolved', 'closed'] } },
      }),
      db.clientSupportTicket.count({ where: breachWhere }),
      db.clientSupportTicket.count({ where: atRiskWhere }),
      db.clientSupportTicket.count({ where: { status: 'awaiting_client' } }),
      db.clientSupportTicket.findMany({
        where: { createdAt: { gte: performanceSince } },
        take: 5000,
        select: {
          createdAt: true,
          firstResponseDueAt: true,
          resolutionDueAt: true,
          firstRespondedAt: true,
          resolvedAt: true,
          clientRating: true,
        },
      }),
    ]);

    const firstResponseSamples = performanceTickets.filter(
      (ticket) => ticket.firstRespondedAt,
    );
    const resolutionSamples = performanceTickets.filter(
      (ticket) => ticket.resolvedAt,
    );
    const ratedSamples = performanceTickets.filter(
      (ticket) => ticket.clientRating !== null,
    );
    const fullyMeasuredResolved = performanceTickets.filter(
      (ticket) =>
        ticket.firstRespondedAt &&
        ticket.firstResponseDueAt &&
        ticket.resolvedAt &&
        ticket.resolutionDueAt,
    );

    const averageMinutes = (
      items: typeof performanceTickets,
      pick: (ticket: (typeof performanceTickets)[number]) => Date | null,
    ) => {
      if (!items.length) return null;
      const totalMinutes = items.reduce((sum, ticket) => {
        const end = pick(ticket);
        return sum + (end ? Math.max(0, end.getTime() - ticket.createdAt.getTime()) / 60000 : 0);
      }, 0);
      return Math.round(totalMinutes / items.length);
    };

    const avgFirstResponseMinutes = averageMinutes(
      firstResponseSamples,
      (ticket) => ticket.firstRespondedAt,
    );
    const avgResolutionMinutes = averageMinutes(
      resolutionSamples,
      (ticket) => ticket.resolvedAt,
    );
    const slaCompliant = fullyMeasuredResolved.filter(
      (ticket) =>
        ticket.firstRespondedAt!.getTime() <= ticket.firstResponseDueAt!.getTime() &&
        ticket.resolvedAt!.getTime() <= ticket.resolutionDueAt!.getTime(),
    ).length;
    const slaCompliancePct = fullyMeasuredResolved.length
      ? Math.round((slaCompliant / fullyMeasuredResolved.length) * 1000) / 10
      : null;
    const csatAverage = ratedSamples.length
      ? Math.round(
          (ratedSamples.reduce((sum, ticket) => sum + Number(ticket.clientRating || 0), 0) /
            ratedSamples.length) *
            100,
        ) / 100
      : null;

    return NextResponse.json({
      success: true,
      data: tickets.map((ticket) => ({
        ...ticket,
        sla: supportSlaState(ticket, now),
      })),
      summary: {
        total,
        open,
        unread,
        highPriority,
        breached,
        atRisk,
        awaitingClient,
        performance: {
          windowDays: 90,
          avgFirstResponseMinutes,
          avgResolutionMinutes,
          slaCompliancePct,
          csatAverage,
          csatResponses: ratedSamples.length,
          resolvedSamples: resolutionSamples.length,
        },
      },
      filters: {
        limit,
        slaWarningMinutes: warningMinutes,
      },
    });
  } catch (error) {
    console.error('Support Desk list error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load Support Desk' },
      { status: 500 },
    );
  }
}
