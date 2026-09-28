import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';
import { postVendorBillJournal } from '@/lib/finance-ledger';

const schema = z.object({
  action: z.enum(['post', 'reject']),
  reason: z.string().trim().max(2000).default(''),
}).superRefine((value, ctx) => {
  if (value.action === 'reject' && value.reason.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'A meaningful rejection reason of at least 5 characters is required',
    });
  }
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid supplier bill decision', details: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission is required' }, { status: 403 });
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
        vendor: { select: { id: true, active: true } },
        purchaseOrder: true,
        attachments: { select: { id: true } },
        allocations: { select: { id: true } },
      },
    });
    if (!bill) return { error: 'Supplier bill not found', status: 404 as const };
    if (bill.status !== 'draft') {
      return { error: 'Only pending supplier bill drafts can be decided', status: 409 as const };
    }

    if (
      policy?.enabled &&
      policy.requireSecondApprover &&
      bill.createdByAdminId &&
      bill.createdByAdminId === actor.id
    ) {
      return { error: 'Maker-checker prevents the supplier bill preparer from deciding their own draft', status: 409 as const };
    }

    if (parsed.data.action === 'reject') {
      if (bill.allocations.length) {
        return { error: 'A supplier bill with payment allocations cannot be rejected', status: 409 as const };
      }
      const updated = await tx.financeVendorBill.update({
        where: { id: bill.id },
        data: {
          status: 'rejected',
          rejectedByAdminId: actor.id,
          rejectedBy: actor.name || actor.email,
          rejectedAt: new Date(),
          rejectionReason: parsed.data.reason,
        },
      });
      return { bill: updated, rejected: true as const };
    }

    if (!bill.vendor.active) {
      return { error: 'Supplier is no longer active', status: 409 as const };
    }
    if (!bill.attachments.length) {
      return { error: 'Supplier invoice PDF evidence is required before posting', status: 409 as const };
    }
    if (bill.dueDate.getTime() < bill.issueDate.getTime()) {
      return { error: 'Due date cannot be earlier than issue date', status: 409 as const };
    }

    if (bill.purchaseOrder) {
      if (!['received', 'closed'].includes(bill.purchaseOrder.status)) {
        return { error: 'Linked purchase order is no longer received or closed', status: 409 as const };
      }
      if (bill.purchaseOrder.vendorId !== bill.vendorId) {
        return { error: 'Supplier bill vendor no longer matches the linked purchase order', status: 409 as const };
      }
      if (bill.purchaseOrder.currency !== bill.currency) {
        return { error: 'Supplier bill currency no longer matches the linked purchase order', status: 409 as const };
      }
      if (bill.purchaseOrder.total.minus(bill.taxableAmount).abs().gt('0.01')) {
        return { error: 'Supplier bill net amount no longer matches the purchase order commitment', status: 409 as const };
      }
      const receiptCount = await tx.financePurchaseReceipt.count({
        where: { purchaseOrderId: bill.purchaseOrder.id },
      });
      if (!receiptCount) {
        return { error: 'Linked purchase order no longer has receipt evidence for three-way matching', status: 409 as const };
      }
    }

    if (bill.taxTreatment === 'standard') {
      const taxProfile = await tx.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
      if (!taxProfile || !taxProfile.enabled) {
        return { error: 'Standard Ghana VAT is disabled. Review the draft before posting.', status: 409 as const };
      }
      if (bill.issueDate.getTime() < taxProfile.effectiveFrom.getTime()) {
        return { error: 'The configured Ghana VAT profile is not effective on this supplier bill date', status: 409 as const };
      }
      const ratesChanged =
        !bill.vatRate.eq(taxProfile.vatRate) ||
        !bill.nhilRate.eq(taxProfile.nhilRate) ||
        !bill.getfundRate.eq(taxProfile.getfundRate);
      if (ratesChanged) {
        return { error: 'The statutory tax profile has changed since this draft was prepared. Reject and recreate the supplier bill with current rates.', status: 409 as const };
      }
    }

    await postVendorBillJournal(tx, {
      billId: bill.id,
      payableNumber: bill.payableNumber,
      issueDate: bill.issueDate,
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

    const updated = await tx.financeVendorBill.update({
      where: { id: bill.id },
      data: {
        status: 'unpaid',
        approvedByAdminId: actor.id,
        approvedBy: actor.name || actor.email,
        approvedAt: new Date(),
      },
    });
    return { bill: updated, rejected: false as const };
  });

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  await recordAdminAudit({
    admin: actor,
    action: result.rejected
      ? 'admin.finance_supplier_bill_rejected'
      : 'admin.finance_supplier_bill_posted',
    entity: 'FinanceVendorBill',
    entityId: result.bill.id,
    details: {
      payableNumber: result.bill.payableNumber,
      vendorId: result.bill.vendorId,
      amount: result.bill.total.toFixed(2),
      currency: result.bill.currency,
      reason: result.rejected ? parsed.data.reason : '',
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result.bill,
      taxableAmount: result.bill.taxableAmount.toFixed(2),
      vatRate: result.bill.vatRate.toFixed(2),
      vatAmount: result.bill.vatAmount.toFixed(2),
      nhilRate: result.bill.nhilRate.toFixed(2),
      nhilAmount: result.bill.nhilAmount.toFixed(2),
      getfundRate: result.bill.getfundRate.toFixed(2),
      getfundAmount: result.bill.getfundAmount.toFixed(2),
      total: result.bill.total.toFixed(2),
    },
  });
}
