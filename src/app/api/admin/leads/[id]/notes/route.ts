import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';

const createNoteSchema = z.object({
  note: z.string().trim().min(1).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveAdminContext(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = createNoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid note', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const lead = await db.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const note = await db.leadNote.create({
      data: {
        leadId: id,
        note: parsed.data.note,
        author: session.name || session.email,
      },
    });

    await db.lead.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error('Error adding CRM note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add CRM note' },
      { status: 500 },
    );
  }
}
