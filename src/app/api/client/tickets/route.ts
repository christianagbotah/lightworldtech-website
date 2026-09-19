import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

const createSchema = z.object({
  projectId: z.string().trim().min(1).nullable().optional(),
  subject: z.string().trim().min(3).max(180),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  message: z.string().trim().min(3).max(5000),
});

export async function POST(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid support request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const account = await db.clientPortalAccount.findUnique({
      where: { id: session.sub },
      select: { id: true, active: true, mustChangePassword: true, sessionVersion: true, name: true },
    });
    if (!account?.active || account.sessionVersion !== session.ver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (account.mustChangePassword) {
      return NextResponse.json({ error: 'Password change required' }, { status: 403 });
    }

    let projectId: string | null = null;
    if (parsed.data.projectId) {
      const project = await db.clientProject.findFirst({
        where: { id: parsed.data.projectId, accountId: account.id },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      projectId = project.id;
    }

    const ticket = await db.clientTicket.create({
      data: {
        accountId: account.id,
        projectId,
        subject: parsed.data.subject,
        priority: parsed.data.priority,
        messages: {
          create: {
            authorType: 'client',
            authorName: account.name,
            message: parsed.data.message,
          },
        },
      },
      include: {
        project: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error('Client ticket create failed:', error);
    return NextResponse.json({ success: false, error: 'Could not create support request' }, { status: 500 });
  }
}
