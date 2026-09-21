import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveClientContext } from '@/lib/client-access';
import { finalizeHubtelPayment } from '@/lib/hubtel-payment';

export async function GET(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const reference = new URL(request.url).searchParams.get('reference')?.trim() || '';
  if (!reference) return NextResponse.json({ success: false, error: 'Payment reference is required' }, { status: 400 });

  const intent = await db.hubtelPaymentIntent.findFirst({
    where: { clientReference: reference, organizationId: context.user.organizationId },
    select: { id: true, status: true, recordedPaymentId: true },
  });
  if (!intent) return NextResponse.json({ success: false, error: 'Payment reference not found' }, { status: 404 });

  try {
    const result = await finalizeHubtelPayment(reference);
    return NextResponse.json({
      success: true,
      data: {
        reference,
        status: result.verifiedStatus,
        paid: Boolean(result.payment),
      },
    });
  } catch {
    const latest = await db.hubtelPaymentIntent.findUnique({
      where: { id: intent.id },
      select: { status: true, recordedPaymentId: true },
    });
    return NextResponse.json({
      success: true,
      data: {
        reference,
        status: latest?.status || intent.status,
        paid: Boolean(latest?.recordedPaymentId || intent.recordedPaymentId),
      },
    });
  }
}
