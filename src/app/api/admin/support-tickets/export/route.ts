import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { toCsv } from '@/lib/csv';
import { supportSlaState } from '@/lib/support-ticket';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const status = searchParams.get('status')?.trim();
  const priority = searchParams.get('priority')?.trim();
  const category = searchParams.get('category')?.trim();
  const assignedTo = searchParams.get('assignedTo')?.trim();
  const sla = searchParams.get('sla')?.trim();
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

  const tickets = await db.clientSupportTicket.findMany({
    where,
    take: 5000,
    orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      organization: { select: { name: true } },
      project: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      _count: { select: { messages: true, attachments: true, internalNotes: true } },
    },
  });

  const rows: unknown[][] = [
    [
      'Ticket Number', 'Client', 'Contact Name', 'Contact Email', 'Project',
      'Subject', 'Category', 'Status', 'Priority', 'Assignee', 'SLA State',
      'First Response Due', 'First Responded', 'Resolution Due', 'Resolved',
      'Replies', 'Attachments', 'Internal Notes', 'Opened', 'Last Activity',
    ],
    ...tickets.map((ticket) => {
      const slaState = supportSlaState(ticket, now);
      return [
        ticket.ticketNumber,
        ticket.organization.name,
        ticket.createdBy.name,
        ticket.createdBy.email,
        ticket.project?.name || '',
        ticket.subject,
        ticket.category,
        ticket.status,
        ticket.priority,
        ticket.assignedTo,
        slaState.breached ? 'breached' : 'within_sla',
        ticket.firstResponseDueAt?.toISOString() || '',
        ticket.firstRespondedAt?.toISOString() || '',
        ticket.resolutionDueAt?.toISOString() || '',
        ticket.resolvedAt?.toISOString() || '',
        ticket._count.messages,
        ticket._count.attachments,
        ticket._count.internalNotes,
        ticket.createdAt.toISOString(),
        ticket.lastActivityAt.toISOString(),
      ];
    }),
  ];

  await recordAdminAudit({
    admin: actor,
    action: 'admin.support_tickets_exported',
    entity: 'ClientSupportTicket',
    details: {
      rowCount: tickets.length,
      filters: {
        status: status || 'all',
        priority: priority || 'all',
        category: category || 'all',
        assignedTo: assignedTo || 'all',
        sla: sla || 'all',
        queryApplied: Boolean(q),
      },
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lightworld-support-' + date + '.csv"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
