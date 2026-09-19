import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';

export async function GET(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    const organization = await db.clientOrganization.findUnique({
      where: { id: context.user.organizationId },
      include: {
        projects: {
          orderBy: [{ updatedAt: 'desc' }],
          include: {
            milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
            documents: {
              where: { visibleToClient: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true, title: true, description: true, url: true,
                category: true, createdAt: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true, authorType: true, authorName: true,
                message: true, createdAt: true,
              },
            },
          },
        },
        announcements: {
          where: { active: true, publishAt: { lte: now } },
          orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
          take: 30,
          select: {
            id: true, projectId: true, title: true, body: true,
            publishAt: true, createdAt: true,
          },
        },
      },
    });

    if (!organization || organization.status !== 'active') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: { name: context.user.name, email: context.user.email, role: context.user.role },
        organization: {
          id: organization.id,
          name: organization.name,
          primaryContactName: organization.primaryContactName,
          primaryEmail: organization.primaryEmail,
          primaryPhone: organization.primaryPhone,
        },
        projects: organization.projects,
        tickets: organization.tickets,
        announcements: organization.announcements,
      },
    });
  } catch (error) {
    console.error('Client portal fetch error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load client portal' }, { status: 500 });
  }
}
