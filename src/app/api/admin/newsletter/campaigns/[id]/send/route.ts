import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { buildNewsletterCampaignMessage } from '@/lib/newsletter-campaign';
import { dispatchNewsletterCampaignBatch } from '@/lib/newsletter-dispatch';
import { sanitizeMailError, sendTransactionalMail } from '@/lib/mail';

export const runtime = 'nodejs';

const sendSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('test'),
    email: z.string().trim().email(),
  }),
  z.object({
    mode: z.literal('batch'),
    batchSize: z.number().int().min(1).max(10).optional().default(10),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid send request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const campaign = await db.newsletterCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (parsed.data.mode === 'test') {
      const message = buildNewsletterCampaignMessage(
        campaign,
        { id: 'campaign-test', email: parsed.data.email },
        { test: true },
      );
      try {
        const result = await sendTransactionalMail(message);
        await db.newsletterDelivery.create({
          data: {
            recipient: parsed.data.email,
            kind: 'campaign_test',
            subject: campaign.subject,
            status: 'sent',
            transport: result.transport,
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Campaign test accepted by the outbound mail transport.',
          data: { transport: result.transport },
        });
      } catch (error) {
        const safe = sanitizeMailError(error);
        await db.newsletterDelivery.create({
          data: {
            recipient: parsed.data.email,
            kind: 'campaign_test',
            subject: campaign.subject,
            status: 'failed',
            error: safe,
          },
        }).catch((auditError) => console.error('Campaign test audit failed:', auditError));
        return NextResponse.json(
          { success: false, error: 'Campaign test failed', details: safe },
          { status: 502 },
        );
      }
    }

    const result = await dispatchNewsletterCampaignBatch(id, parsed.data.batchSize);
    return NextResponse.json({
      success: true,
      data: result,
      message:
        result.status === 'sent'
          ? 'Campaign delivery is complete.'
          : 'Batch processed. Continue sending until remaining reaches zero.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process campaign delivery';
    const status =
      message === 'Campaign not found' ? 404 :
      message.includes('already been sent') || message.includes('Mark the campaign Ready') ? 409 :
      500;
    console.error('Newsletter campaign send failed:', error);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Unable to process campaign delivery' : message, details: sanitizeMailError(error) },
      { status },
    );
  }
}
