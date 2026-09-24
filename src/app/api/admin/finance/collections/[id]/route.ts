import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const activity = await db.financeCollectionActivity.findUnique({
    where: { id },
    include: { invoice: { select: { invoiceNumber: true } } },
  });
  if (!activity) {
    return NextResponse.json({ success: false, error: 'Collection follow-up not found' }, { status: 404 });
  }
  if (!activity.nextFollowUpAt) {
    return NextResponse.json({ success: false, error: 'This activity does not contain a follow-up task' }, { status: 409 });
  }
  if (activity.completedAt) {
    return NextResponse.json({ success: true, data: activity });
  }

  const updated = await db.financeCollectionActivity.update({
    where: { id: activity.id },
    data: { completedAt: new Date() },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_collection_follow_up_completed',
    entity: 'FinanceCollectionActivity',
    entityId: updated.id,
    details: {
      invoiceId: updated.invoiceId,
      invoiceNumber: activity.invoice.invoiceNumber,
      nextFollowUpAt: updated.nextFollowUpAt?.toISOString() || null,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
