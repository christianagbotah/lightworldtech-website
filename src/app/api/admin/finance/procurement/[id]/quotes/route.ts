import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const createSchema = z.object({
  vendorId: z.string().trim().min(1),
  quoteReference: z.string().trim().max(160).optional().default(''),
  currency: z.string().trim().max(3).default('GHS'),
  total: z.coerce.number().positive().max(999999999999),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(4000).optional().default(''),
});

const selectSchema = z.object({
  quoteId: z.string().trim().min(1),
  notes: z.string().trim().max(4000).optional().default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid supplier quote', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const requisition = await db.financePurchaseRequest.findUnique({
    where: { id },
    include: { purchaseOrder: { select: { id: true } } },
  });
  if (!requisition) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 });
  if (!['submitted', 'approved'].includes(requisition.status) || requisition.purchaseOrder) {
    return NextResponse.json({ success: false, error: 'Quotes can only be captured before a requisition is converted to a purchase order' }, { status: 409 });
  }

  const vendor = await db.financeVendor.findFirst({
    where: { id: parsed.data.vendorId, active: true },
    select: { id: true, name: true },
  });
  if (!vendor) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 400 });

  const currency = normalizeCurrency(parsed.data.currency);
  if (currency !== requisition.currency) {
    return NextResponse.json({ success: false, error: 'Supplier quote currency must match the requisition currency' }, { status: 409 });
  }

  const quote = await db.financeSupplierQuote.create({
    data: {
      requestId: requisition.id,
      vendorId: vendor.id,
      quoteReference: parsed.data.quoteReference,
      currency,
      total: parsed.data.total,
      leadTimeDays: parsed.data.leadTimeDays ?? null,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      notes: parsed.data.notes,
      createdById: actor.id,
      createdByName: actor.name || actor.email,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_quote_recorded',
    entity: 'FinancePurchaseRequest',
    entityId: requisition.id,
    details: {
      requestNumber: requisition.requestNumber,
      quoteId: quote.id,
      vendorId: quote.vendorId,
      currency: quote.currency,
      total: quote.total.toFixed(2),
    },
  });

  return NextResponse.json({
    success: true,
    data: { ...quote, total: quote.total.toFixed(2) },
  }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission required' }, { status: 403 });
  }
  const parsed = selectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid quote selection', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const requisition = await db.financePurchaseRequest.findUnique({
    where: { id },
    include: {
      purchaseOrder: { select: { id: true } },
      supplierQuotes: true,
    },
  });
  if (!requisition) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 });
  if (requisition.status !== 'approved' || requisition.purchaseOrder) {
    return NextResponse.json({ success: false, error: 'A supplier quote can only be selected on an approved, unconverted requisition' }, { status: 409 });
  }
  if (requisition.requestedByAdminId === actor.id) {
    return NextResponse.json({ success: false, error: 'The requisition requester cannot select the winning supplier quote' }, { status: 409 });
  }

  const quote = requisition.supplierQuotes.find((item) => item.id === parsed.data.quoteId);
  if (!quote) return NextResponse.json({ success: false, error: 'Supplier quote does not belong to this requisition' }, { status: 404 });
  if (quote.validUntil && quote.validUntil < new Date()) {
    return NextResponse.json({ success: false, error: 'Expired supplier quotes cannot be selected' }, { status: 409 });
  }

  await db.$transaction([
    db.financeSupplierQuote.updateMany({
      where: { requestId: requisition.id },
      data: {
        selected: false,
        selectedAt: null,
        selectedById: '',
        selectedByName: '',
      },
    }),
    db.financeSupplierQuote.update({
      where: { id: quote.id },
      data: {
        selected: true,
        selectedAt: new Date(),
        selectedById: actor.id,
        selectedByName: actor.name || actor.email,
        notes: parsed.data.notes || quote.notes,
      },
    }),
    db.financePurchaseRequest.update({
      where: { id: requisition.id },
      data: {
        vendorId: quote.vendorId,
        estimatedAmount: quote.total,
      },
    }),
  ]);

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_quote_selected',
    entity: 'FinancePurchaseRequest',
    entityId: requisition.id,
    details: {
      requestNumber: requisition.requestNumber,
      quoteId: quote.id,
      vendorId: quote.vendorId,
      currency: quote.currency,
      total: quote.total.toFixed(2),
    },
  });

  return NextResponse.json({ success: true });
}
