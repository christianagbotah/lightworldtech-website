import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(2000).default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getActiveClientContext(request);
  if (!context) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid satisfaction rating', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const ticket = await db.clientSupportTicket.findFirst({
    where: {
      id,
      organizationId: context.user.organizationId,
    },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      ratedAt: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ success: false, error: 'Support ticket not found' }, { status: 404 });
  }
  if (!['resolved', 'closed'].includes(ticket.status)) {
    return NextResponse.json(
      { success: false, error: 'Satisfaction can be submitted after the ticket is resolved' },
      { status: 409 },
    );
  }
  if (ticket.ratedAt) {
    return NextResponse.json(
      { success: false, error: 'Satisfaction feedback has already been submitted for this ticket' },
      { status: 409 },
    );
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.clientSupportTicket.update({
      where: { id: ticket.id },
      data: {
        clientRating: parsed.data.rating,
        clientFeedback: parsed.data.feedback,
        ratedAt: now,
        lastActivityAt: now,
        unreadByAdmin: true,
      },
    });

    await tx.clientTicketEvent.create({
      data: {
        ticketId: ticket.id,
        type: 'csat_submitted',
        actorType: 'client',
        actorName: context.user.name,
        details: JSON.stringify({
          rating: parsed.data.rating,
          feedbackProvided: Boolean(parsed.data.feedback),
        }),
      },
    });

    return result;
  });

  return NextResponse.json({
    success: true,
    data: {
      rating: updated.clientRating,
      feedback: updated.clientFeedback,
      ratedAt: updated.ratedAt,
    },
  }, { status: 201 });
}
