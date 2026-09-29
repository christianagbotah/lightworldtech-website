import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';

const schema = z.object({
  reason: z.string().trim().min(3).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  ) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'A rejection reason of at least 3 characters is required' },
      { status: 400 },
    );
  }

  const { id } = await params;
  const policy = await getFinanceApprovalPolicy();

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-supplier-bill-lifecycle:' + id,
    );

    const bill = await tx.financeVendorBill.findUnique({
      where: { id },
      select: {
        id: true,
        payableNumber: true,
        vendorId: true,
        status: true,
        createdByAdminId: true,
        createdBy: true,
        purchaseOrderId: true,
      },
    });

    if (!bill) return { bill: null, error: 'Supplier bill not found', status: 404 };
    if (bill.status !== 'draft') {
      return { bill: null, error: 'Only draft supplier bills can be rejected', status: 409 };
    }
    if (
      policy?.enabled &&
      policy.requireSecondApprover &&
      bill.createdByAdminId &&
      bill.createdByAdminId === actor.id
    ) {
      return {
        bill: null,
        error: 'Maker-checker prevents the supplier bill preparer from rejecting their own draft',
        status: 409,
      };
    }

    const rejected = await tx.financeVendorBill.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedByAdminId: actor.id,
        rejectedBy: actor.name || actor.email,
        rejectedAt: new Date(),
        rejectionReason: parsed.data.reason,
      },
      select: {
        id: true,
        payableNumber: true,
        vendorId: true,
        status: true,
        purchaseOrderId: true,
        createdByAdminId: true,
        createdBy: true,
        rejectedByAdminId: true,
        rejectedBy: true,
        rejectedAt: true,
        rejectionReason: true,
      },
    });

    return { bill: rejected, error: '', status: 200 };
  });

  if (!result.bill) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_bill_draft_rejected',
    entity: 'FinanceVendorBill',
    entityId: result.bill.id,
    details: {
      payableNumber: result.bill.payableNumber,
      vendorId: result.bill.vendorId,
      purchaseOrderId: result.bill.purchaseOrderId,
      reason: result.bill.rejectionReason,
      makerAdminId: result.bill.createdByAdminId,
      checkerAdminId: actor.id,
    },
  });

  return NextResponse.json({ success: true, data: result.bill });
}
