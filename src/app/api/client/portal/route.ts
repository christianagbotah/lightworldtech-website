import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await db.portalClient.findFirst({
      where: { id: session.sub, active: true },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        lastLogin: true,
        projects: {
          orderBy: [{ updatedAt: 'desc' }],
          select: {
            id: true,
            name: true,
            status: true,
            summary: true,
            progress: true,
            startDate: true,
            targetDate: true,
            createdAt: true,
            updatedAt: true,
            milestones: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                dueDate: true,
                order: true,
              },
            },
            deliverables: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                description: true,
                url: true,
                status: true,
                deliveredAt: true,
                createdAt: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { updatedAt: 'desc' },
          take: 100,
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
        },
      },
    });

    if (!client) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Client portal read error:', error);
    return NextResponse.json({ success: false, error: 'Could not load portal data.' }, { status: 500 });
  }
}
