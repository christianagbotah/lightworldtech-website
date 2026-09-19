import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const organization = await db.clientOrganization.findUnique({
      where: { id: session.organizationId },
      include: {
        projects: {
          orderBy: [{ updatedAt: 'desc' }],
          include: { milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true, projectId: true, subject: true, message: true,
            status: true, priority: true, createdAt: true, updatedAt: true,
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
        user: { name: session.name, email: session.email, role: session.role },
        organization: {
          id: organization.id,
          name: organization.name,
          primaryContactName: organization.primaryContactName,
          primaryEmail: organization.primaryEmail,
          primaryPhone: organization.primaryPhone,
        },
        projects: organization.projects,
        tickets: organization.tickets,
      },
    });
  } catch (error) {
    console.error('Client portal fetch error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load client portal' }, { status: 500 });
  }
}
