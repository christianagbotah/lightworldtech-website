import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { supportSlaState } from '@/lib/support-ticket';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await db.clientSupportTicket.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            primaryContactName: true,
            primaryEmail: true,
            primaryPhone: true,
          },
        },
        project: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        internalNotes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
    }

    if (ticket.unreadByAdmin) {
      await db.clientSupportTicket.update({
        where: { id: ticket.id },
        data: { unreadByAdmin: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        unreadByAdmin: false,
        sla: supportSlaState(ticket),
      },
    });
  } catch (error) {
    console.error('Support Desk ticket detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load support ticket' },
      { status: 500 },
    );
  }
}
