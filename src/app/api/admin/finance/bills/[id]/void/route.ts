import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy, parseApprovalAllocations } from '@/lib/finance-approvals';
import { postVendorBillVoidJournal } from '@/lib/finance-ledger';

const schema = z.object({
  reason: z.string().trim().min(5).max(4000),
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
      { success: false, error: 'A meaningful void reason of at least 5 characters is required' },
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
      include: {
        allocations: { select: { id: true }, take: 1 },
        replacementBill: { select: { id: true, payableNumber: true, status: true } },
      },
    });

    if (!bill) return { bill: null, error: 'Supplier bill not found', status: 404 };
    if (bill.status === 'draft') {
      return {
        bill: null,
        error: 'Draft supplier bills must be rejected rather than voided',
        status: 409,
      };
    }
    if (bill.status === 'rejected') {
      return {
        bill: null,
        error: 'A rejected supplier bill is terminal and cannot be voided',
        status: 409,
      };
    }
    if (bill.status === 'void') {
      return {
        bill: null,
        error: 'This supplier bill is already void',
        status: 409,
      };
    }
    if (bill.replacementBill) {
      return {
        bill: null,
        error: 'This supplier bill already has replacement ' + bill.replacementBill.payableNumber,
        status: 409,
      };
    }
    if (
      policy?.enabled &&
      policy.requireSecondApprover &&
      bill.createdByAdminId &&
      bill.createdByAdminId === actor.id
    ) {
      return {
        bill: null,
        error: 'Maker-checker prevents the supplier bill preparer from voiding their own bill',
        status: 409,
      };
    }
    if (bill.allocations.length > 0) {
      return {
        bill: null,
        error: 'A supplier bill with allocated payments cannot be voided',
        status: 409,
      };
    }

    const treasuryReservation = await tx.financeTreasuryPaymentRunLine.findFirst({
      where: {
        billId: bill.id,
        status: { in: ['planned', 'submitted'] },
        run: { status: { in: ['draft', 'submitted'] } },
      },
      select: {
        id: true,
        run: { select: { runNumber: true, status: true } },
      },
    });
    if (treasuryReservation) {
      return {
        bill: null,
        error:
          'Supplier bill is reserved in treasury run ' +
          treasuryReservation.run.runNumber +
          '. Remove or cancel that cash workflow before voiding.',
        status: 409,
      };
    }

    const pendingApprovals = await tx.financeOutflowApproval.findMany({
      where: {
        outflowType: 'vendor_payment',
        status: { in: ['pending', 'scheduled'] },
      },
      select: {
        requestNumber: true,
        allocationsJson: true,
      },
      take: 2000,
    });
    const reservedApproval = pendingApprovals.find((approval) =>
      parseApprovalAllocations(approval.allocationsJson).some((allocation) => allocation.billId === bill.id),
    );
    if (reservedApproval) {
      return {
        bill: null,
        error:
          'Supplier bill is reserved by payment approval ' +
          reservedApproval.requestNumber +
          '. Cancel that cash workflow before voiding.',
        status: 409,
      };
    }

    const voidDate = new Date();
    await postVendorBillVoidJournal(tx, {
      billId: bill.id,
      payableNumber: bill.payableNumber,
      voidDate,
      currency: bill.currency,
      total: bill.total,
      taxableAmount: bill.taxableAmount,
      vatAmount: bill.vatAmount,
      nhilAmount: bill.nhilAmount,
      getfundAmount: bill.getfundAmount,
      taxRecoverable: bill.taxRecoverable,
      category: bill.category,
      postedBy: actor.name || actor.email,
    });

    const voided = await tx.financeVendorBill.update({
      where: { id: bill.id },
      data: {
        status: 'void',
        voidedByAdminId: actor.id,
        voidedBy: actor.name || actor.email,
        voidedAt: voidDate,
        voidReason: parsed.data.reason,
      },
      select: {
        id: true,
        payableNumber: true,
        vendorId: true,
        currency: true,
        total: true,
        status: true,
        purchaseOrderId: true,
        createdByAdminId: true,
        createdBy: true,
        voidedByAdminId: true,
        voidedBy: true,
        voidedAt: true,
        voidReason: true,
      },
    });

    return { bill: voided, error: '', status: 200 };
  });

  if (!result.bill) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_bill_voided',
    entity: 'FinanceVendorBill',
    entityId: result.bill.id,
    details: {
      payableNumber: result.bill.payableNumber,
      vendorId: result.bill.vendorId,
      amount: result.bill.total.toFixed(2),
      currency: result.bill.currency,
      purchaseOrderId: result.bill.purchaseOrderId,
      reason: result.bill.voidReason,
      makerAdminId: result.bill.createdByAdminId,
      checkerAdminId: actor.id,
      replacementAllowed: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result.bill,
      total: result.bill.total.toFixed(2),
    },
  });
}
