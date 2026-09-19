import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getClientSession } from '@/lib/client-auth';

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const account = await db.clientPortalAccount.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        active: true,
        mustChangePassword: true,
        sessionVersion: true,
      },
    });

    if (!account?.active || account.sessionVersion !== session.ver) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionVersion: _sessionVersion, ...safeAccount } = account;

    if (account.mustChangePassword) {
      return NextResponse.json({
        success: true,
        requiresPasswordChange: true,
        data: { account: safeAccount, projects: [], tickets: [], announcements: [] },
      });
    }

    const [projects, tickets, announcements] = await Promise.all([
      db.clientProject.findMany({
        where: { accountId: account.id },
        include: {
          milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
          documents: {
            where: { visible: true },
            orderBy: { updatedAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.clientTicket.findMany({
        where: { accountId: account.id },
        include: {
          project: { select: { id: true, title: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      db.clientAnnouncement.findMany({
        where: {
          active: true,
          publishedAt: { lte: new Date() },
          OR: [{ accountId: null }, { accountId: account.id }],
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      success: true,
      requiresPasswordChange: false,
      data: { account: safeAccount, projects, tickets, announcements },
    });
  } catch (error) {
    console.error('Client portal load failed:', error);
    return NextResponse.json({ success: false, error: 'Portal unavailable' }, { status: 500 });
  }
}
