import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  subject: z.string().trim().min(2).max(180).optional(),
  preheader: z.string().trim().max(240).optional(),
  body: z.string().trim().min(2).max(30_000).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: z.string().trim().max(1000).optional().refine(
    (value) => value === undefined || !value || /^https?:\/\//i.test(value),
    'CTA URL must use http or https',
  ),
  status: z.enum(['draft', 'ready']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const [campaign, activeSubscribers, sentCount, failedCount, recentDeliveries] = await Promise.all([
      db.newsletterCampaign.findUnique({ where: { id } }),
      db.newsletterSubscriber.count({ where: { active: true } }),
      db.newsletterCampaignDelivery.count({ where: { campaignId: id, status: 'sent' } }),
      db.newsletterCampaignDelivery.count({ where: { campaignId: id, status: 'failed' } }),
      db.newsletterCampaignDelivery.findMany({
        where: { campaignId: id },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          recipient: true,
          status: true,
          transport: true,
          error: true,
          attempts: true,
          sentAt: true,
          updatedAt: true,
        },
      }),
    ]);

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        summary: {
          activeSubscribers,
          sent: sentCount,
          failed: failedCount,
          remaining: Math.max(0, activeSubscribers - sentCount),
        },
        deliveries: recentDeliveries,
      },
    });
  } catch (error) {
    console.error('Failed to load newsletter campaign:', error);
    return NextResponse.json({ success: false, error: 'Failed to load campaign' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid campaign update', details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const existing = await db.newsletterCampaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (existing.status === 'sending' || existing.status === 'sent') {
      return NextResponse.json(
        { success: false, error: 'A sending or sent campaign is immutable' },
        { status: 409 },
      );
    }

    const next = { ...existing, ...parsed.data };
    if (parsed.data.status === 'ready') {
      if (!next.title.trim() || !next.subject.trim() || !next.body.trim()) {
        return NextResponse.json(
          { success: false, error: 'Title, subject and body are required before a campaign can be marked ready' },
          { status: 400 },
        );
      }
    }

    const campaign = await db.newsletterCampaign.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Failed to update newsletter campaign:', error);
    return NextResponse.json({ success: false, error: 'Failed to update campaign' }, { status: 500 });
  }
}
