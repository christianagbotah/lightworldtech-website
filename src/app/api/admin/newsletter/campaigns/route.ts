import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const createSchema = z.object({
  title: z.string().trim().min(2).max(180),
  subject: z.string().trim().min(2).max(180),
  preheader: z.string().trim().max(240).optional().default(''),
  body: z.string().trim().min(2).max(30_000),
  ctaLabel: z.string().trim().max(80).optional().default(''),
  ctaUrl: z.string().trim().max(1000).optional().default('').refine(
    (value) => !value || /^https?:\/\//i.test(value),
    'CTA URL must use http or https',
  ),
});

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [campaigns, activeSubscribers] = await Promise.all([
      db.newsletterCampaign.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
        include: { _count: { select: { deliveries: true } } },
      }),
      db.newsletterSubscriber.count({ where: { active: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activeSubscribers,
        campaigns: campaigns.map((campaign) => ({
          ...campaign,
          deliveryCount: campaign._count.deliveries,
          _count: undefined,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to load newsletter campaigns:', error);
    return NextResponse.json({ success: false, error: 'Failed to load campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid campaign', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const campaign = await db.newsletterCampaign.create({
      data: { ...parsed.data, status: 'draft' },
    });
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error('Failed to create newsletter campaign:', error);
    return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 });
  }
}
