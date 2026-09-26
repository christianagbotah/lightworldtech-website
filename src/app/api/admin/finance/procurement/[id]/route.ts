import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'convert', 'receive', 'close', 'cancel_request', 'cancel_order']),
  notes: z.string().trim().max(4000).optional().default(''),
  vendorId: z.string().trim().nullable().optional(),
  expectedDate: z.string().datetime().nullable().optional(),
});

function poNumber() {
  return 'PO-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomBytes(3).toString('hex').toUpperCase();
}

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
    return NextResponse.json({ success: false, error: 'Invalid procurement action', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const action = parsed.data.action;

  if (['approve', 'reject'].includes(action)) {
    if (!hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
      return NextResponse.json({ success: false, error: 'Finance approval permission required' }, { status: 403 });
    }
    const item = await db.financePurchaseRequest.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 });
    if (item.status !== 'submitted') {
      return NextResponse.json({ success: false, error: 'Only submitted requisitions can be decided' }, { status: 409 });
    }
    if (item.requestedByAdminId === actor.id) {
      return NextResponse.json({ success: false, error: 'A requisition must be approved by a different finance operator' }, { status: 409 });
    }

    const updated = await db.financePurchaseRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        decidedByAdminId: actor.id,
        decidedByName: actor.name || actor.email,
        decidedAt: new Date(),
        decisionNotes: parsed.data.notes,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: action === 'approve' ? 'admin.finance_purchase_request_approved' : 'admin.finance_purchase_request_rejected',
      entity: 'FinancePurchaseRequest',
      entityId: updated.id,
      details: { requestNumber: updated.requestNumber, decisionNotes: updated.decisionNotes },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if (action === 'convert') {
    const item = await db.financePurchaseRequest.findUnique({
      where: { id },
      include: { purchaseOrder: true },
    });
    if (!item) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 });
    if (item.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Only approved requisitions can be converted to purchase orders' }, { status: 409 });
    }
    if (item.purchaseOrder) {
      return NextResponse.json({ success: false, error: 'A purchase order already exists for this requisition' }, { status: 409 });
    }

    const vendorId = parsed.data.vendorId || item.vendorId;
    if (!vendorId) return NextResponse.json({ success: false, error: 'Select an active supplier before issuing the purchase order' }, { status: 400 });
    const vendor = await db.financeVendor.findFirst({ where: { id: vendorId, active: true }, select: { id: true, name: true } });
    if (!vendor) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 400 });

    const order = await db.$transaction(async (tx) => {
      const created = await tx.financePurchaseOrder.create({
        data: {
          poNumber: poNumber(),
          requestId: item.id,
          vendorId,
          projectId: item.projectId,
          currency: item.currency,
          total: item.estimatedAmount,
          expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : item.neededBy,
          status: 'issued',
          notes: parsed.data.notes,
          issuedBy: actor.name || actor.email,
        },
      });
      await tx.financePurchaseRequest.update({
        where: { id: item.id },
        data: { status: 'converted', convertedAt: new Date(), vendorId },
      });
      return created;
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_purchase_order_issued',
      entity: 'FinancePurchaseOrder',
      entityId: order.id,
      details: {
        poNumber: order.poNumber,
        requestNumber: item.requestNumber,
        vendorId,
        currency: order.currency,
        total: order.total.toFixed(2),
      },
    });
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  }

  if (action === 'cancel_request') {
    const item = await db.financePurchaseRequest.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ success: false, error: 'Purchase requisition not found' }, { status: 404 });
    if (!['submitted', 'approved', 'rejected'].includes(item.status)) {
      return NextResponse.json({ success: false, error: 'This requisition can no longer be cancelled' }, { status: 409 });
    }
    const updated = await db.financePurchaseRequest.update({ where: { id }, data: { status: 'cancelled', decisionNotes: parsed.data.notes || item.decisionNotes } });
    await recordAdminAudit({ admin: actor, action: 'admin.finance_purchase_request_cancelled', entity: 'FinancePurchaseRequest', entityId: id, details: { requestNumber: item.requestNumber } });
    return NextResponse.json({ success: true, data: updated });
  }

  const order = await db.financePurchaseOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 });

  if (action === 'receive') {
    return NextResponse.json({
      success: false,
      error: 'Record line-level receipt quantities from the procurement workspace. Direct full-receipt confirmation is disabled.',
    }, { status: 409 });
  }

  if (action === 'close') {
    if (order.status !== 'received') return NextResponse.json({ success: false, error: 'Only fully received purchase orders can be closed' }, { status: 409 });
    const receiptCount = await db.financePurchaseReceipt.count({ where: { purchaseOrderId: order.id } });
    if (!receiptCount) return NextResponse.json({ success: false, error: 'A purchase receipt is required before closing the purchase order' }, { status: 409 });
    const updated = await db.financePurchaseOrder.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date(), closedBy: actor.name || actor.email },
    });
    await recordAdminAudit({ admin: actor, action: 'admin.finance_purchase_order_closed', entity: 'FinancePurchaseOrder', entityId: id, details: { poNumber: order.poNumber } });
    return NextResponse.json({ success: true, data: updated });
  }

  if (!hasAdminPermission(actor.role, actor.permissions, 'finance.approve')) {
    return NextResponse.json({ success: false, error: 'Finance approval permission required to cancel a purchase order' }, { status: 403 });
  }
  if (!['issued'].includes(order.status)) {
    return NextResponse.json({ success: false, error: 'Only unreceived purchase orders can be cancelled' }, { status: 409 });
  }
  const updated = await db.financePurchaseOrder.update({ where: { id }, data: { status: 'cancelled', notes: parsed.data.notes || order.notes } });
  await recordAdminAudit({ admin: actor, action: 'admin.finance_purchase_order_cancelled', entity: 'FinancePurchaseOrder', entityId: id, details: { poNumber: order.poNumber } });
  return NextResponse.json({ success: true, data: updated });
}
