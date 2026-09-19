import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tickets = await db.clientTicket.findMany({
    include: {
      account: { select: { id: true, name: true, organization: true, email: true } },
      project: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ success: true, data: tickets });
}
