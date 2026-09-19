import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

const ticketSchema = z.object({
  projectId: z.string().min(1).nullable().optional(),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export async function POST(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const rate = consumePublicRateLimit(request, 'client-ticket', 20, 60 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many support requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = ticketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid support request.', details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await db.clientProject.findFirst({
        where: { id: parsed.data.projectId, clientId: session.sub },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
      }
    }

    const ticket = await db.clientTicket.create({
      data: {
        clientId: session.sub,
        projectId: parsed.data.projectId || null,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority: parsed.data.priority,
      },
      select: {
        id: true,
        projectId: true,
        subject: true,
        message: true,
        status: true,
        priority: true,
        adminResponse: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error('Client ticket create error:', error);
    return NextResponse.json({ success: false, error: 'Could not create support request.' }, { status: 500 });
  }
}
