import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';

export async function POST(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const result = await db.clientSupportTicket.updateMany({
    where: {
      organizationId: context.user.organizationId,
      unreadByClient: true,
    },
    data: { unreadByClient: false },
  });

  return NextResponse.json({ success: true, data: { updated: result.count } });
}
