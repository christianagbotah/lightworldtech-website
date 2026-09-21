import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const messages = await db.contactMessage.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows: unknown[][] = [
      ['Message ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status', 'Received'],
      ...messages.map((message) => [
        message.id,
        message.name,
        message.email,
        message.phone,
        message.subject,
        message.message,
        message.read ? 'Read' : 'Unread',
        message.createdAt.toISOString(),
      ]),
    ];

    await recordAdminAudit({
      admin: actor,
      action: 'admin.messages_exported',
      entity: 'ContactMessage',
      details: {
        rowCount: messages.length,
        unreadOnly,
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lightworld-messages-' + date + '.csv"',
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to export contact messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export messages' },
      { status: 500 },
    );
  }
}
