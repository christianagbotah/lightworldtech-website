import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { qualifyLead } from '@/lib/lead-intelligence';

export const runtime = 'nodejs';

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.union([z.string().trim().email(), z.literal('')]).default(''),
  phone: z.string().trim().max(80).default(''),
  source: z.string().trim().max(80).default('manual'),
  subject: z.string().trim().max(300).default(''),
  message: z.string().trim().max(4000).default(''),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const status = params.get('status')?.trim();
    const category = params.get('category')?.trim();
    const search = params.get('search')?.trim();

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { summary: { contains: search } },
        { assignedTo: { contains: search } },
      ];
    }

    const leads = await db.lead.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 250,
    });

    const stageCounts = await db.lead.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return NextResponse.json({
      success: true,
      data: leads,
      stageCounts: Object.fromEntries(stageCounts.map((row) => [row.status, row._count._all])),
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = createLeadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const qualification = qualifyLead(parsed.data);
    const lead = await db.lead.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        source: parsed.data.source,
        ...qualification,
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 });
  }
}
