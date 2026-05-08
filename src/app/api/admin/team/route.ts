import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const members = await db.teamMember.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, bio, email, linkedin, twitter, image, order, active } = body;

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const member = await db.teamMember.create({
      data: {
        name, role,
        bio: bio || '', email: email || '',
        linkedin: linkedin || '', twitter: twitter || '',
        image: image || '', order: order || 0,
        active: active !== false,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 });
  }
}
