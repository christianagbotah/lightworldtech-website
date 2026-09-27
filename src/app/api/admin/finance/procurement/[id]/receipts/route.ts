import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  notes: z.string().trim().max(4000).optional().default(''),
  lines: z.array(z.object({
    requestLineId: z.string().trim().min(1),
    quantity: z.coerce.number().nonnegative().max(999999),
    rejectedQuantity: z.coerce.number().nonnegative().max(999999).optional().default(0),
    inspectionNotes: z.string().trim().max(1000).optional().default(''),
  }).refine((line) => line.quantity + line.rejectedQuantity > 0, {
    message: 'Enter an accepted or rejected quantity',
  })).min(1).max(100),
});

function receiptNumber() {
  return 'GRN-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomBytes(3).toString('hex').toUpperCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid receipt quantities', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const order = await db.financePurchaseOrder.findUnique({
    where: { id },
    include: {
      request: {
        include: {
          lines: { orderBy: { createdAt: 'asc' } },
        },
      },
      receipts: {
        include: { lines: true },
      },
    },
  });

  if (!order) return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 });
  if (!['issued', 'partially_received'].includes(order.status)) {
    return NextResponse.json({ success: false, error: 'Only open purchase orders can receive items' }, { status: 409 });
  }
  if (!order.request) {
    return NextResponse.json({ success: false, error: 'This purchase order has no source requisition lines to receive' }, { status: 409 });
  }

  const ordered = new Map(order.request.lines.map((line) => [line.id, line.quantity]));
  const alreadyReceived = new Map<string, Prisma.Decimal>();
  for (const receipt of order.receipts) {
    for (const line of receipt.lines) {
      alreadyReceived.set(
        line.requestLineId,
        (alreadyReceived.get(line.requestLineId) || new Prisma.Decimal(0)).plus(line.quantity),
      );
    }
  }

  const unique = new Set<string>();
  const receivedLines: Array<{
    requestLineId: string;
    quantity: Prisma.Decimal;
    rejectedQuantity: Prisma.Decimal;
    inspectionNotes: string;
  }> = [];
  for (const line of parsed.data.lines) {
    if (unique.has(line.requestLineId)) {
      return NextResponse.json({ success: false, error: 'Each purchase order line can appear only once per receipt' }, { status: 400 });
    }
    unique.add(line.requestLineId);

    const orderedQuantity = ordered.get(line.requestLineId);
    if (!orderedQuantity) {
      return NextResponse.json({ success: false, error: 'Receipt line does not belong to this purchase order' }, { status: 409 });
    }
    const quantity = new Prisma.Decimal(line.quantity).toDecimalPlaces(3);
    const rejectedQuantity = new Prisma.Decimal(line.rejectedQuantity).toDecimalPlaces(3);
    const prior = alreadyReceived.get(line.requestLineId) || new Prisma.Decimal(0);
    if (prior.plus(quantity).gt(orderedQuantity)) {
      return NextResponse.json({
        success: false,
        error: 'Accepted quantity exceeds the remaining purchase order quantity',
        requestLineId: line.requestLineId,
        orderedQuantity: orderedQuantity.toFixed(3),
        alreadyAccepted: prior.toFixed(3),
      }, { status: 409 });
    }
    receivedLines.push({
      requestLineId: line.requestLineId,
      quantity,
      rejectedQuantity,
      inspectionNotes: line.inspectionNotes,
    });
  }

  const created = await db.$transaction(async (tx) => {
    const receipt = await tx.financePurchaseReceipt.create({
      data: {
        receiptNumber: receiptNumber(),
        purchaseOrderId: order.id,
        notes: parsed.data.notes,
        receivedByAdminId: actor.id,
        receivedByName: actor.name || actor.email,
        lines: { create: receivedLines },
      },
      include: { lines: true },
    });

    const cumulative = new Map(alreadyReceived);
    for (const line of receivedLines) {
      cumulative.set(
        line.requestLineId,
        (cumulative.get(line.requestLineId) || new Prisma.Decimal(0)).plus(line.quantity),
      );
    }
    const complete = order.request!.lines.every((line) =>
      (cumulative.get(line.id) || new Prisma.Decimal(0)).gte(line.quantity),
    );

    await tx.financePurchaseOrder.update({
      where: { id: order.id },
      data: complete
        ? {
            status: 'received',
            receivedAt: new Date(),
            receivedBy: actor.name || actor.email,
          }
        : {
            status: 'partially_received',
          },
    });

    return { receipt, complete };
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_purchase_receipt_recorded',
    entity: 'FinancePurchaseOrder',
    entityId: order.id,
    details: {
      poNumber: order.poNumber,
      receiptNumber: created.receipt.receiptNumber,
      lineCount: created.receipt.lines.length,
      acceptedQuantity: created.receipt.lines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0)).toFixed(3),
      rejectedQuantity: created.receipt.lines.reduce((sum, line) => sum.plus(line.rejectedQuantity), new Prisma.Decimal(0)).toFixed(3),
      fullyReceived: created.complete,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: created.receipt.id,
      receiptNumber: created.receipt.receiptNumber,
      receivedAt: created.receipt.receivedAt,
      receivedByName: created.receipt.receivedByName,
      fullyReceived: created.complete,
      lines: created.receipt.lines.map((line) => ({
        ...line,
        quantity: line.quantity.toFixed(3),
        rejectedQuantity: line.rejectedQuantity.toFixed(3),
      })),
    },
  }, { status: 201 });
}