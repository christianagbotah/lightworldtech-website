import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notification';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const payment = await db.clientPayment.findUnique({
    where: { id },
    select: {
      id: true,
      paymentNumber: true,
      organizationId: true,
      customerNotificationStatus: true,
    },
  });
  if (!payment) {
    return NextResponse.json({ success: false, error: 'Customer payment not found' }, { status: 404 });
  }
  if (!['failed', 'partial'].includes(payment.customerNotificationStatus)) {
    return NextResponse.json(
      { success: false, error: 'This payment confirmation does not need a retry' },
      { status: 409 },
    );
  }

  const result = await notifyCustomerPaymentReceived(id, { retryFailedChannels: true });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_payment_confirmation_retried',
    entity: 'ClientPayment',
    entityId: id,
    details: {
      paymentNumber: payment.paymentNumber,
      organizationId: payment.organizationId,
      previousStatus: payment.customerNotificationStatus,
      resultStatus: result.status,
      channels: result.channels,
    },
  });

  return NextResponse.json({ success: true, data: result });
}
