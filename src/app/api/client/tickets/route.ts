import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

const schema = z.object({
  subject: z.string().trim().min(3).max(240),
  message: z.string().trim().min(3).max(8000),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  projectId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid ticket', details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.projectId) {
      const project = await db.clientProject.findFirst({
        where: { id: parsed.data.projectId, organizationId: session.organizationId },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const ticket = await db.clientSupportTicket.create({
      data: {
        organizationId: session.organizationId,
        projectId: parsed.data.projectId || null,
        createdById: session.sub,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority: parsed.data.priority,
      },
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error('Client ticket creation error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create support ticket' }, { status: 500 });
  }
}
