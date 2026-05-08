import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual team member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const member = await db.teamMember.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error('Error fetching team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

// PUT update team member
const updateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.string().min(1, 'Role is required').optional(),
  bio: z.string().optional(),
  image: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    const member = await db.teamMember.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

// DELETE team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    await db.teamMember.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Team member deleted' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
