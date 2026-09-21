import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { supportSlaState } from '@/lib/support-ticket';

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const category = searchParams.get('category')?.trim();
    const assignedTo = searchParams.get('assignedTo')?.trim();
    const sla = searchParams.get('sla')?.trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 100)));
    const now = new Date();

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

    const [tickets, total, open, unread, highPriority, breached, awaitingClient] = await Promise.all([
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
      db.clientSupportTicket.count({ where: { status: 'awaiting_client' } }),
    ]);

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
        awaitingClient,
      },
      filters: {
        limit,
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
