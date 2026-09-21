import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';

const schema = z.object({
  ids: z.array(z.string().min(1).max(120)).min(1).max(100),
  read: z.boolean(),
});

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid bulk message update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await db.contactMessage.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { read: parsed.data.read },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.messages_bulk_updated',
      entity: 'ContactMessage',
      details: {
        requestedCount: parsed.data.ids.length,
        updatedCount: result.count,
        read: parsed.data.read,
      },
    });

    return NextResponse.json({
      success: true,
      data: { updated: result.count },
    });
  } catch (error) {
    console.error('Bulk contact-message update failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update selected messages' },
      { status: 500 },
    );
  }
}
