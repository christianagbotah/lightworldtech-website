import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import {
  SUPPORT_TICKET_CATEGORIES,
  nextSupportTicketNumber,
  notifyClientTicketCreated,
  notifySupportDesk,
  supportSla,
} from '@/lib/support-ticket';

const schema = z.object({
  subject: z.string().trim().min(3).max(240),
  message: z.string().trim().min(3).max(8000),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  category: z.enum(SUPPORT_TICKET_CATEGORIES).default('general'),
  projectId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid ticket', details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await db.clientProject.findFirst({
        where: { id: parsed.data.projectId, organizationId: context.user.organizationId },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const now = new Date();
    const ticketNumber = await nextSupportTicketNumber(now);
    const sla = supportSla(parsed.data.priority, now);

    const ticket = await db.clientSupportTicket.create({
      data: {
        ticketNumber,
        organizationId: context.user.organizationId,
        projectId: parsed.data.projectId || null,
        createdById: context.user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority: parsed.data.priority,
        category: parsed.data.category,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        lastActivityAt: now,
        unreadByAdmin: true,
        unreadByClient: false,
      },
    });

    await db.clientTicketEvent.create({
      data: {
        ticketId: ticket.id,
        type: 'ticket_created',
        actorType: 'client',
        actorName: context.user.name,
        details: JSON.stringify({
          priority: ticket.priority,
          category: ticket.category,
          projectId: ticket.projectId,
        }),
      },
    });

    await notifyClientTicketCreated({
      to: context.user.email,
      customerName: context.user.name,
      ticketNumber,
      subject: ticket.subject,
      firstResponseDueAt: sla.firstResponseDueAt,
    });

    await notifySupportDesk({
      ticketNumber,
      organizationName: context.organization.name,
      customerName: context.user.name,
      customerEmail: context.user.email,
      subject: ticket.subject,
      message: ticket.message,
      priority: ticket.priority,
      category: ticket.category,
      kind: 'created',
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error('Client ticket creation error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create support ticket' }, { status: 500 });
  }
}
