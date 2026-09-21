import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';
import {
  SUPPORT_TICKET_CATEGORIES,
  notifyClientOfSupportStatus,
  supportSla,
} from '@/lib/support-ticket';

const schema = z.object({
  ids: z.array(z.string().min(1).max(120)).min(1).max(100),
  status: z.enum(['open', 'in_progress', 'awaiting_client', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  category: z.enum(SUPPORT_TICKET_CATEGORIES).optional(),
  assignedTo: z.string().trim().email().or(z.literal('')).optional(),
}).refine(
  (value) =>
    value.status !== undefined ||
    value.priority !== undefined ||
    value.category !== undefined ||
    value.assignedTo !== undefined,
  { message: 'Choose at least one bulk update' },
).refine(
  (value) => !value.status || value.ids.length <= 25,
  { message: 'Bulk status changes are limited to 25 tickets at a time', path: ['ids'] },
);

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid bulk support update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.assignedTo) {
    const assignee = await db.admin.findUnique({
      where: { email: parsed.data.assignedTo },
      select: { active: true, role: true, permissions: true },
    });
    if (
      !assignee ||
      !assignee.active ||
      (assignee.role !== 'super_admin' &&
        !normalizeAdminPermissions(assignee.permissions).includes('clients.manage'))
    ) {
      return NextResponse.json(
        { success: false, error: 'Selected assignee is not an active Support Desk agent' },
        { status: 400 },
      );
    }
  }

  const tickets = await db.clientSupportTicket.findMany({
    where: { id: { in: parsed.data.ids } },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!tickets.length) {
    return NextResponse.json({ success: false, error: 'No support tickets found' }, { status: 404 });
  }

  const now = new Date();
  const updatedCount = await db.$transaction(async (tx) => {
    let count = 0;
    for (const ticket of tickets) {
      const data: Record<string, unknown> = {};
      if (parsed.data.status !== undefined) {
        data.status = parsed.data.status;
        data.unreadByClient = true;
        if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
          data.resolvedAt = ticket.resolvedAt || now;
        } else if (ticket.status === 'resolved' || ticket.status === 'closed') {
          data.resolvedAt = null;
        }
      }
      if (parsed.data.priority !== undefined) {
        data.priority = parsed.data.priority;
        const sla = supportSla(parsed.data.priority, ticket.createdAt);
        data.firstResponseDueAt = sla.firstResponseDueAt;
        data.resolutionDueAt = sla.resolutionDueAt;
      }
      if (parsed.data.category !== undefined) data.category = parsed.data.category;
      if (parsed.data.assignedTo !== undefined) data.assignedTo = parsed.data.assignedTo;

      const changed = await tx.clientSupportTicket.update({
        where: { id: ticket.id },
        data,
      });

      await tx.clientTicketEvent.create({
        data: {
          ticketId: ticket.id,
          type: 'bulk_ticket_updated',
          actorType: 'admin',
          actorName: actor.name || actor.email,
          details: JSON.stringify({
            status: parsed.data.status,
            priority: parsed.data.priority,
            category: parsed.data.category,
            assignedTo: parsed.data.assignedTo,
          }),
        },
      });
      count += 1;
    }
    return count;
  });

  if (parsed.data.status !== undefined) {
    await Promise.allSettled(
      tickets
        .filter((ticket) => ticket.status !== parsed.data.status)
        .map((ticket) =>
          notifyClientOfSupportStatus({
            to: ticket.createdBy.email,
            customerName: ticket.createdBy.name,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            status: parsed.data.status!,
          }),
        ),
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.support_tickets_bulk_updated',
    entity: 'ClientSupportTicket',
    details: {
      requestedCount: parsed.data.ids.length,
      updatedCount,
      fields: {
        status: parsed.data.status,
        priority: parsed.data.priority,
        category: parsed.data.category,
        assignedTo: parsed.data.assignedTo,
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: { updated: updatedCount },
  });
}
