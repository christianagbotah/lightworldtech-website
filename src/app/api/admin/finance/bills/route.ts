import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postVendorBillJournal } from '@/lib/finance-ledger';
import { computeTaxComponents, invoiceBalance, nextPayableNumber, normalizeCurrency, sumAmounts, vendorBillStatusFromBalance } from '@/lib/finance';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';
import { normalizeSupplierInvoiceReference } from '@/lib/supplier-invoice-reference';

const schema = z.object({
  vendorId: z.string().min(1),
  vendorReference: z.string().trim().max(180).default(''),
  category: z.string().trim().min(2).max(120).default('operating_expense'),
  currency: z.string().trim().max(3).default('GHS'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxableAmount: z.coerce.number().positive().max(999999999999).optional(),
  total: z.coerce.number().positive().max(999999999999).optional(),
  taxTreatment: z.enum(['none', 'standard', 'zero', 'exempt']).default('none'),
  taxRecoverable: z.boolean().default(true),
  notes: z.string().trim().max(8000).default(''),
  purchaseOrderId: z.string().trim().nullable().optional(),
}).refine((value) => value.dueDate.getTime() >= value.issueDate.getTime(), {
  message: 'Due date cannot be earlier than issue date',
  path: ['dueDate'],
}).refine((value) => Number(value.taxableAmount || value.total || 0) > 0, {
  message: 'Supplier bill amount must be greater than zero',
  path: ['taxableAmount'],
});

function serialize(bill: any) {
  const balance = invoiceBalance(bill.total, bill.allocations || []);
  return {
    ...bill,
    taxableAmount: bill.taxableAmount.toFixed(2),
    vatRate: bill.vatRate.toFixed(2),
    vatAmount: bill.vatAmount.toFixed(2),
    nhilRate: bill.nhilRate.toFixed(2),
    nhilAmount: bill.nhilAmount.toFixed(2),
    getfundRate: bill.getfundRate.toFixed(2),
    getfundAmount: bill.getfundAmount.toFixed(2),
    total: bill.total.toFixed(2),
    amountPaid: sumAmounts(bill.allocations || []).toFixed(2),
    balance: balance.toFixed(2),
    derivedStatus: vendorBillStatusFromBalance({
      storedStatus: bill.status,
      total: bill.total,
      allocations: bill.allocations || [],
      dueDate: bill.dueDate,
    }),
    allocations: (bill.allocations || []).map((item: any) => ({
      ...item,
      amount: item.amount.toFixed(2),
      payment: item.payment ? { ...item.payment, amount: item.payment.amount.toFixed(2) } : undefined,
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId') || undefined;
  const bills = await db.financeVendorBill.findMany({
    where: vendorId ? { vendorId } : undefined,
    orderBy: [{ dueDate: 'asc' }, { issueDate: 'desc' }],
    include: {
      vendor: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, poNumber: true, status: true, total: true } },
      attachments: { orderBy: { createdAt: 'desc' } },
      allocations: {
        include: {
          payment: { select: { id: true, paymentNumber: true, amount: true, paidAt: true, method: true, reference: true } },
        },
      },
    },
    take: 1000,
  });
  return NextResponse.json({ success: true, data: bills.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid supplier bill', details: parsed.error.flatten() }, { status: 400 });

  const vendor = await db.financeVendor.findUnique({
    where: { id: parsed.data.vendorId },
    select: { id: true, active: true, paymentTermsDays: true },
  });
  if (!vendor || !vendor.active) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 404 });

  const defaultDueDate = new Date(parsed.data.issueDate);
  defaultDueDate.setUTCDate(defaultDueDate.getUTCDate() + vendor.paymentTermsDays);
  const dueDateOverride = parsed.data.dueDate.toISOString().slice(0, 10) !== defaultDueDate.toISOString().slice(0, 10);

  const taxableAmount = new Prisma.Decimal(
    parsed.data.taxableAmount ?? parsed.data.total ?? 0,
  ).toDecimalPlaces(2);
  const currency = normalizeCurrency(parsed.data.currency);
  const vendorReferenceNormalized = normalizeSupplierInvoiceReference(parsed.data.vendorReference);

  let matchedPurchaseOrder: Awaited<ReturnType<typeof db.financePurchaseOrder.findUnique>> = null;
  if (parsed.data.purchaseOrderId) {
    matchedPurchaseOrder = await db.financePurchaseOrder.findUnique({
      where: { id: parsed.data.purchaseOrderId },
    });
    if (!matchedPurchaseOrder) {
      return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 });
    }
    if (!['received', 'closed'].includes(matchedPurchaseOrder.status)) {
      return NextResponse.json({ success: false, error: 'Purchase order must be received before a supplier bill can be matched' }, { status: 409 });
    }
    const receiptCount = await db.financePurchaseReceipt.count({ where: { purchaseOrderId: matchedPurchaseOrder.id } });
    if (!receiptCount) {
      return NextResponse.json({ success: false, error: 'Purchase order has no line-level receipt evidence for three-way matching' }, { status: 409 });
    }
    if (matchedPurchaseOrder.vendorId !== parsed.data.vendorId) {
      return NextResponse.json({ success: false, error: 'Supplier bill vendor does not match the purchase order supplier' }, { status: 409 });
    }
    if (matchedPurchaseOrder.currency !== currency) {
      return NextResponse.json({ success: false, error: 'Supplier bill currency does not match the purchase order currency' }, { status: 409 });
    }
    if (matchedPurchaseOrder.total.minus(taxableAmount).abs().gt('0.01')) {
      return NextResponse.json({
        success: false,
        error: 'Supplier bill net amount does not match the purchase order commitment',
        purchaseOrderAmount: matchedPurchaseOrder.total.toFixed(2),
        billTaxableAmount: taxableAmount.toFixed(2),
      }, { status: 409 });
    }
    const existingBill = await db.financeVendorBill.findUnique({
      where: { purchaseOrderId: matchedPurchaseOrder.id },
      select: { id: true, payableNumber: true },
    });
    if (existingBill) {
      return NextResponse.json({ success: false, error: 'This purchase order is already matched to supplier bill ' + existingBill.payableNumber }, { status: 409 });
    }
  }

  let taxProfile: Awaited<ReturnType<typeof db.financeTaxProfile.findUnique>> = null;
  if (parsed.data.taxTreatment === 'standard') {
    taxProfile = await db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
    if (!taxProfile || !taxProfile.enabled) {
      return NextResponse.json(
        { success: false, error: 'Standard Ghana VAT is disabled. Enable the statutory tax profile first.' },
        { status: 409 },
      );
    }
    if (parsed.data.issueDate.getTime() < taxProfile.effectiveFrom.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'The configured Ghana VAT profile is not effective on this supplier bill date',
          effectiveFrom: taxProfile.effectiveFrom,
        },
        { status: 409 },
      );
    }
  }

  const taxResult = computeTaxComponents({
    taxableAmount,
    treatment: parsed.data.taxTreatment,
    vatRate: taxProfile?.vatRate,
    nhilRate: taxProfile?.nhilRate,
    getfundRate: taxProfile?.getfundRate,
  });
  const {
    vatRate,
    vatAmount,
    nhilRate,
    nhilAmount,
    getfundRate,
    getfundAmount,
    total,
  } = taxResult;
  const payableNumber = await nextPayableNumber(parsed.data.issueDate);
  const policy = await getFinanceApprovalPolicy();
  const makerCheckerRequired = Boolean(policy?.enabled && policy.requireSecondApprover);
  const initialStatus = makerCheckerRequired ? 'draft' : 'unpaid';
  const transactionResult = await db.$transaction(async (tx) => {
    if (vendorReferenceNormalized) {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'lightworld-supplier-invoice-reference:' + parsed.data.vendorId + ':' + vendorReferenceNormalized,
      );

      const duplicate = await tx.financeVendorBill.findFirst({
        where: {
          vendorId: parsed.data.vendorId,
          vendorReferenceNormalized,
          status: { not: 'rejected' },
        },
        select: {
          id: true,
          payableNumber: true,
          vendorReference: true,
          status: true,
          issueDate: true,
        },
      });
      if (duplicate) {
        return { bill: null, duplicate };
      }
    }

    const created = await tx.financeVendorBill.create({
      data: {
        payableNumber,
        vendorId: parsed.data.vendorId,
        vendorReference: parsed.data.vendorReference,
        vendorReferenceNormalized,
        category: parsed.data.category,
        currency,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        taxTreatment: parsed.data.taxTreatment,
        taxRecoverable: parsed.data.taxRecoverable,
        taxableAmount,
        vatRate,
        vatAmount,
        nhilRate,
        nhilAmount,
        getfundRate,
        getfundAmount,
        total,
        notes: parsed.data.notes,
        purchaseOrderId: matchedPurchaseOrder?.id || null,
        status: initialStatus,
        createdByAdminId: actor.id,
        createdBy: actor.name || actor.email,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true, status: true, total: true } },
        attachments: { orderBy: { createdAt: 'desc' } },
        allocations: true,
      },
    });

    if (!makerCheckerRequired) {
      await postVendorBillJournal(tx, {
        billId: created.id,
        payableNumber: created.payableNumber,
        issueDate: created.issueDate,
        currency: created.currency,
        total: created.total,
        taxableAmount: created.taxableAmount,
        vatAmount: created.vatAmount,
        nhilAmount: created.nhilAmount,
        getfundAmount: created.getfundAmount,
        taxRecoverable: created.taxRecoverable,
        category: created.category,
        postedBy: actor.name || actor.email,
      });
    }

    return { bill: created, duplicate: null };
  });

  if (transactionResult.duplicate) {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_supplier_bill_duplicate_blocked',
      entity: 'FinanceVendor',
      entityId: parsed.data.vendorId,
      details: {
        vendorReference: parsed.data.vendorReference,
        existingBillId: transactionResult.duplicate.id,
        existingPayableNumber: transactionResult.duplicate.payableNumber,
        existingStatus: transactionResult.duplicate.status,
      },
    });
    return NextResponse.json({
      success: false,
      error:
        'Supplier invoice reference ' +
        parsed.data.vendorReference +
        ' is already recorded as ' +
        transactionResult.duplicate.payableNumber,
      duplicate: transactionResult.duplicate,
    }, { status: 409 });
  }

  const bill = transactionResult.bill!;

  await recordAdminAudit({
    admin: actor,
    action: makerCheckerRequired
      ? 'admin.finance_supplier_bill_draft_created'
      : 'admin.finance_supplier_bill_created',
    entity: 'FinanceVendorBill',
    entityId: bill.id,
    details: {
      payableNumber,
      vendorId: bill.vendorId,
      total: bill.total.toFixed(2),
      currency: bill.currency,
      taxTreatment: bill.taxTreatment,
      taxRecoverable: bill.taxRecoverable,
      taxableAmount: bill.taxableAmount.toFixed(2),
      vatAmount: bill.vatAmount.toFixed(2),
      nhilAmount: bill.nhilAmount.toFixed(2),
      getfundAmount: bill.getfundAmount.toFixed(2),
      purchaseOrderId: bill.purchaseOrderId,
      vendorReference: bill.vendorReference,
      supplierPaymentTermsDays: vendor.paymentTermsDays,
      defaultDueDate: defaultDueDate.toISOString().slice(0, 10),
      dueDateOverride,
      makerCheckerRequired,
    },
  });
  return NextResponse.json(
    { success: true, pendingApproval: makerCheckerRequired, data: serialize(bill) },
    { status: 201 },
  );
}