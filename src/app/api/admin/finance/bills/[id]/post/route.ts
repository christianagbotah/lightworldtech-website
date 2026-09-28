import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';
import { postVendorBillJournal } from '@/lib/finance-ledger';

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
        attachments: { select: { id: true }, take: 1 },
        allocations: { select: { id: true }, take: 1 },
        purchaseOrder: {
          select: {
            id: true,
            vendorId: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!bill) return { bill: null, error: 'Supplier bill not found', status: 404 };
    if (bill.status !== 'draft') {
      return { bill: null, error: 'Only draft supplier bills can be posted', status: 409 };
    }
    if (
      policy?.enabled &&
      policy.requireSecondApprover &&
      bill.createdByAdminId &&
      bill.createdByAdminId === actor.id
    ) {
      return {
        bill: null,
        error: 'Maker-checker prevents the supplier bill preparer from posting their own draft',
        status: 409,
      };
    }
    if (!bill.vendor.active) {
      return { bill: null, error: 'Supplier is no longer active', status: 409 };
    }
    if (!bill.attachments.length) {
      return {
        bill: null,
        error: 'Supplier invoice evidence must be attached before this draft can be posted',
        status: 409,
      };
    }
    if (bill.allocations.length) {
      return {
        bill: null,
        error: 'A draft supplier bill cannot already have payment allocations',
        status: 409,
      };
    }

    if (bill.purchaseOrder) {
      if (!['received', 'closed'].includes(bill.purchaseOrder.status)) {
        return {
          bill: null,
          error: 'Matched purchase order is no longer in a received or closed state',
          status: 409,
        };
      }
      if (bill.purchaseOrder.vendorId !== bill.vendorId) {
        return {
          bill: null,
          error: 'Matched purchase order supplier no longer matches this bill',
          status: 409,
        };
      }
      if (bill.purchaseOrder.currency !== bill.currency) {
        return {
          bill: null,
          error: 'Matched purchase order currency no longer matches this bill',
          status: 409,
        };
      }
      const receiptCount = await tx.financePurchaseReceipt.count({
        where: { purchaseOrderId: bill.purchaseOrder.id },
      });
      if (!receiptCount) {
        return {
          bill: null,
          error: 'Matched purchase order no longer has receipt evidence for three-way matching',
          status: 409,
        };
      }
    }

    if (bill.taxTreatment === 'standard') {
      const taxProfile = await tx.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
      if (!taxProfile || !taxProfile.enabled) {
        return {
          bill: null,
          error: 'Standard Ghana VAT is disabled. Review the draft before posting.',
          status: 409,
        };
      }
      if (bill.issueDate.getTime() < taxProfile.effectiveFrom.getTime()) {
        return {
          bill: null,
          error: 'The configured Ghana VAT profile is not effective on this supplier bill date',
          status: 409,
        };
      }
      const ratesChanged =
        !bill.vatRate.eq(taxProfile.vatRate) ||
        !bill.nhilRate.eq(taxProfile.nhilRate) ||
        !bill.getfundRate.eq(taxProfile.getfundRate);
      if (ratesChanged) {
        return {
          bill: null,
          error: 'The statutory tax profile changed after this draft was prepared. Reject and recreate the bill with current rates.',
          status: 409,
        };
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

    const posted = await tx.financeVendorBill.update({
      where: { id: bill.id },
      data: {
        status: 'unpaid',
        approvedByAdminId: actor.id,
        approvedBy: actor.name || actor.email,
        approvedAt: new Date(),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    return { bill: posted, error: '', status: 200 };
  });

  if (!result.bill) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_bill_posted',
    entity: 'FinanceVendorBill',
    entityId: result.bill.id,
    details: {
      payableNumber: result.bill.payableNumber,
      vendorId: result.bill.vendorId,
      amount: result.bill.total.toFixed(2),
      currency: result.bill.currency,
      purchaseOrderId: result.bill.purchaseOrderId,
      makerAdminId: result.bill.createdByAdminId,
      checkerAdminId: actor.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result.bill,
      taxableAmount: result.bill.taxableAmount.toFixed(2),
      vatAmount: result.bill.vatAmount.toFixed(2),
      nhilAmount: result.bill.nhilAmount.toFixed(2),
      getfundAmount: result.bill.getfundAmount.toFixed(2),
      total: result.bill.total.toFixed(2),
    },
  });
}
