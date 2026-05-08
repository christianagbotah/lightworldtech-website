import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all team members
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');

    const members = await db.teamMember.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST create team member
const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  bio: z.string().optional().default(''),
  image: z.string().optional().default(''),
  email: z.string().email().optional().default('').or(z.literal('')),
  linkedin: z.string().optional().default(''),
  twitter: z.string().optional().default(''),
  order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await db.teamMember.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}
