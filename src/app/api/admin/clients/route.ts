import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const createSchema = z.object({
  name: z.string().trim().min(2).max(180),
  primaryContactName: z.string().trim().max(180).optional().default(''),
  primaryEmail: z.string().trim().email().or(z.literal('')).optional().default(''),
  primaryPhone: z.string().trim().max(80).optional().default(''),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const organizations = await db.clientOrganization.findMany({
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, active: true, lastLogin: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      projects: {
        include: { milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
        orderBy: { updatedAt: 'desc' },
      },
      tickets: { orderBy: { createdAt: 'desc' }, take: 50 },
      _count: { select: { users: true, projects: true, tickets: true } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, data: organizations });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid client organization', details: parsed.error.flatten() }, { status: 400 });
    }

    const organization = await db.clientOrganization.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: organization }, { status: 201 });
  } catch (error) {
    console.error('Create client organization error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create client organization' }, { status: 500 });
  }
}
