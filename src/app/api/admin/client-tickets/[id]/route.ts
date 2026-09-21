import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { normalizeAdminPermissions } from '@/lib/admin-permissions';
import {
  SUPPORT_TICKET_CATEGORIES,
  notifyClientOfSupportStatus,
  supportSla,
} from '@/lib/support-ticket';

const schema = z.object({
  status: z.enum(['open', 'in_progress', 'awaiting_client', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  category: z.enum(SUPPORT_TICKET_CATEGORIES).optional(),
  assignedTo: z.string().trim().email().or(z.literal('')).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid ticket update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientSupportTicket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const data: Record<string, unknown> = { ...parsed.data };
  const now = new Date();

  if (parsed.data.priority && parsed.data.priority !== existing.priority) {
    const sla = supportSla(parsed.data.priority, existing.createdAt);
    data.firstResponseDueAt = sla.firstResponseDueAt;
    data.resolutionDueAt = sla.resolutionDueAt;
  }

  if (parsed.data.status) {
    if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
      data.resolvedAt = existing.resolvedAt || now;
    } else if (existing.status === 'resolved' || existing.status === 'closed') {
      data.resolvedAt = null;
    }
    data.unreadByClient = true;
  }

  const ticket = await db.clientSupportTicket.update({ where: { id }, data });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await notifyClientOfSupportStatus({
      to: existing.createdBy.email,
      customerName: existing.createdBy.name,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
    });
  }

  await db.clientTicketEvent.create({
    data: {
      ticketId: ticket.id,
      type: 'ticket_updated',
      actorType: 'admin',
      actorName: actor.name || actor.email,
      details: JSON.stringify({
        changedFields: Object.keys(parsed.data),
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
      }),
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.support_ticket_updated',
    entity: 'ClientSupportTicket',
    entityId: ticket.id,
    details: {
      ticketNumber: ticket.ticketNumber,
      changedFields: Object.keys(parsed.data),
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      assignedTo: ticket.assignedTo,
    },
  });

  return NextResponse.json({ success: true, data: ticket });
}
