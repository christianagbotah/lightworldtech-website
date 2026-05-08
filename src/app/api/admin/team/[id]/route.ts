import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const member = await db.teamMember.update({ where: { id }, data: body });
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.teamMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
