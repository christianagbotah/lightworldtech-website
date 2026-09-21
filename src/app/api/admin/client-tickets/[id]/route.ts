import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { SUPPORT_TICKET_CATEGORIES, supportSla } from '@/lib/support-ticket';

const schema = z.object({
  status: z.enum(['open', 'in_progress', 'awaiting_client', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  category: z.enum(SUPPORT_TICKET_CATEGORIES).optional(),
  assignedTo: z.string().trim().max(160).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid ticket update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientSupportTicket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
