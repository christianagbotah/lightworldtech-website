import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const lineSchema = z.object({
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().positive().max(999999),
  unitPrice: z.coerce.number().nonnegative().max(999999999),
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(8000).default(''),
  vendorId: z.string().trim().nullable().optional(),
  projectId: z.string().trim().nullable().optional(),
  currency: z.string().trim().max(3).default('GHS'),
  neededBy: z.string().datetime().nullable().optional(),
  lines: z.array(lineSchema).min(1).max(100),
});

function code(prefix: 'PR' | 'PO') {
  return prefix + '-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomBytes(3).toString('hex').toUpperCase();
}

function serializeRequest(item: any) {
  return {
    ...item,
    estimatedAmount: item.estimatedAmount.toFixed(2),
    lines: item.lines.map((line: any) => ({
      ...line,
      quantity: line.quantity.toFixed(3),
      unitPrice: line.unitPrice.toFixed(2),
      amount: line.amount.toFixed(2),
    })),
    purchaseOrder: item.purchaseOrder
      ? { ...item.purchaseOrder, total: item.purchaseOrder.total.toFixed(2) }
      : null,
    supplierQuotes: item.supplierQuotes.map((quote: any) => ({
      ...quote,
      total: quote.total.toFixed(2),
    })),
  };
}

function serializeOrder(item: any) {
  return {
    ...item,
    total: item.total.toFixed(2),
    request: item.request
      ? {
          ...item.request,
          lines: item.request.lines.map((line: any) => ({
            ...line,
            quantity: line.quantity.toFixed(3),
            unitPrice: line.unitPrice.toFixed(2),
            amount: line.amount.toFixed(2),
          })),
        }
      : null,
    receipts: item.receipts.map((receipt: any) => ({
      ...receipt,
      lines: receipt.lines.map((line: any) => ({
        ...line,
        quantity: line.quantity.toFixed(3),
        rejectedQuantity: line.rejectedQuantity.toFixed(3),
      })),
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [requests, orders, vendors, projects] = await Promise.all([
    db.financePurchaseRequest.findMany({
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
      take: 1000,
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
        lines: { orderBy: { createdAt: 'asc' } },
        purchaseOrder: { select: { id: true, poNumber: true, status: true, total: true } },
        supplierQuotes: {
          orderBy: [{ selected: 'desc' }, { createdAt: 'desc' }],
          include: {
            vendor: { select: { id: true, name: true } },
            attachments: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    }),
    db.financePurchaseOrder.findMany({
      orderBy: [{ status: 'asc' }, { issueDate: 'desc' }],
      take: 1000,
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
        request: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
            lines: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, description: true, quantity: true, unitPrice: true, amount: true },
            },
          },
        },
        receipts: {
          orderBy: { receivedAt: 'desc' },
          include: {
            lines: {
              select: {
                id: true,
                requestLineId: true,
                quantity: true,
                rejectedQuantity: true,
                inspectionNotes: true,
              },
            },
          },
        },
        bill: { select: { id: true, payableNumber: true, status: true } },
      },
    }),
    db.financeVendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true },
    }),
    db.clientProject.findMany({
      where: { status: { notIn: ['completed', 'cancelled'] } },
      orderBy: [{ organization: { name: 'asc' } }, { name: 'asc' }],
      take: 1000,
      select: { id: true, name: true, organization: { select: { id: true, name: true } } },
    }),
  ]);

  const now = new Date();
  const approvalAgingCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const agedApprovals = requests.filter((item) => item.status === 'submitted' && item.submittedAt < approvalAgingCutoff);
  const overdueOrders = orders.filter((item) =>
    ['issued', 'partially_received'].includes(item.status)
    && Boolean(item.expectedDate && item.expectedDate < now),
  );
  const partialReceipts = orders.filter((item) => item.status === 'partially_received');
  const awaitingBill = orders.filter((item) => ['received', 'closed'].includes(item.status) && !item.bill);

  const supplierPerformance = vendors.map((vendor) => {
    const vendorOrders = orders.filter((order) => order.vendorId === vendor.id && order.status !== 'cancelled');
    const completed = vendorOrders.filter((order) => Boolean(order.receivedAt));
    const datedCompleted = completed.filter((order) => Boolean(order.expectedDate));
    const onTime = datedCompleted.filter((order) => order.receivedAt! <= order.expectedDate!).length;
    const deliveryDays = completed.map((order) =>
      Math.max(0, (order.receivedAt!.getTime() - order.issueDate.getTime()) / 86_400_000),
    );
    const receiptLines = vendorOrders.flatMap((order) => order.receipts.flatMap((receipt) => receipt.lines));
    const acceptedQuantity = receiptLines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const rejectedQuantity = receiptLines.reduce((sum, line) => sum + Number(line.rejectedQuantity), 0);
    const inspectedQuantity = acceptedQuantity + rejectedQuantity;
    const qualityAcceptanceRate = inspectedQuantity > 0
      ? Math.round((acceptedQuantity / inspectedQuantity) * 1000) / 10
      : null;
    const commitments = new Map<string, number>();
    for (const order of vendorOrders) {
      const code = order.currency.toUpperCase();
      commitments.set(code, (commitments.get(code) || 0) + Number(order.total));
    }
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      orders: vendorOrders.length,
      receivedOrders: completed.length,
      onTimeMeasuredOrders: datedCompleted.length,
      onTimeOrders: onTime,
      onTimeRate: datedCompleted.length ? Math.round((onTime / datedCompleted.length) * 1000) / 10 : null,
      averageDeliveryDays: deliveryDays.length
        ? Math.round((deliveryDays.reduce((sum, value) => sum + value, 0) / deliveryDays.length) * 10) / 10
        : null,
      acceptedQuantity: acceptedQuantity.toFixed(3),
      rejectedQuantity: rejectedQuantity.toFixed(3),
      qualityAcceptanceRate,
      overdueOpenOrders: vendorOrders.filter((order) =>
        ['issued', 'partially_received'].includes(order.status)
        && Boolean(order.expectedDate && order.expectedDate < now),
      ).length,
      partialOpenOrders: vendorOrders.filter((order) => order.status === 'partially_received').length,
      awaitingBillOrders: vendorOrders.filter((order) => ['received', 'closed'].includes(order.status) && !order.bill).length,
      commitmentsByCurrency: [...commitments.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    };
  });

  const exceptions = [
    ...agedApprovals.map((item) => ({
      id: 'approval:' + item.id,
      type: 'approval_aging',
      severity: 'medium',
      title: 'Requisition awaiting approval',
      reference: item.requestNumber,
      detail: item.title + ' · submitted ' + item.submittedAt.toISOString(),
    })),
    ...overdueOrders.map((item) => ({
      id: 'overdue:' + item.id,
      type: 'delivery_overdue',
      severity: 'high',
      title: item.status === 'partially_received' ? 'Partial PO is overdue' : 'PO delivery is overdue',
      reference: item.poNumber,
      detail: item.vendor.name + ' · expected ' + item.expectedDate!.toISOString(),
    })),
    ...awaitingBill.map((item) => ({
      id: 'bill:' + item.id,
      type: 'awaiting_bill',
      severity: 'medium',
      title: 'Received PO awaiting supplier bill',
      reference: item.poNumber,
      detail: item.vendor.name + ' · ' + item.currency + ' ' + item.total.toFixed(2),
    })),
  ].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1) || a.reference.localeCompare(b.reference)).slice(0, 100);

  return NextResponse.json({
    success: true,
    data: {
      canApprove: hasAdminPermission(actor.role, actor.permissions, 'finance.approve'),
      currentAdminId: actor.id,
      requests: requests.map(serializeRequest),
      orders: orders.map(serializeOrder),
      vendors,
      projects,
      summary: {
        awaitingApproval: requests.filter((item) => item.status === 'submitted').length,
        agedApprovals: agedApprovals.length,
        overdueOrders: overdueOrders.length,
        partialReceipts: partialReceipts.length,
        awaitingBill: awaitingBill.length,
      },
      exceptions,
      supplierPerformance,
      methodology: 'Procurement exceptions are deterministic: approval aging starts after 48 hours, delivery overdue uses the recorded PO expected date, partial receipts remain open until ordered quantities are fully received, and received/closed POs remain in Accounts Payable follow-up until a matched supplier bill exists.',
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid purchase requisition', details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.vendorId) {
    const vendor = await db.financeVendor.findFirst({ where: { id: parsed.data.vendorId, active: true }, select: { id: true } });
    if (!vendor) return NextResponse.json({ success: false, error: 'Active supplier not found' }, { status: 400 });
  }

  if (parsed.data.projectId) {
    const project = await db.clientProject.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 400 });
  }

  const lines = parsed.data.lines.map((line) => {
    const quantity = new Prisma.Decimal(line.quantity);
    const unitPrice = new Prisma.Decimal(line.unitPrice).toDecimalPlaces(2);
    return {
      description: line.description,
      quantity,
      unitPrice,
      amount: quantity.mul(unitPrice).toDecimalPlaces(2),
    };
  });
  const estimatedAmount = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0)).toDecimalPlaces(2);

  const created = await db.financePurchaseRequest.create({
    data: {
      requestNumber: code('PR'),
      title: parsed.data.title,
      description: parsed.data.description,
      vendorId: parsed.data.vendorId || null,
      projectId: parsed.data.projectId || null,
      currency: normalizeCurrency(parsed.data.currency),
      estimatedAmount,
      neededBy: parsed.data.neededBy ? new Date(parsed.data.neededBy) : null,
      status: 'submitted',
      requestedByAdminId: actor.id,
      requestedByName: actor.name || actor.email,
      lines: { create: lines },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
      lines: { orderBy: { createdAt: 'asc' } },
      purchaseOrder: true,
      supplierQuotes: {
        orderBy: [{ selected: 'desc' }, { createdAt: 'desc' }],
        include: { vendor: { select: { id: true, name: true } } },
      },
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_purchase_request_submitted',
    entity: 'FinancePurchaseRequest',
    entityId: created.id,
    details: {
      requestNumber: created.requestNumber,
      vendorId: created.vendorId,
      projectId: created.projectId,
      currency: created.currency,
      estimatedAmount: created.estimatedAmount.toFixed(2),
      lineCount: created.lines.length,
    },
  });

  return NextResponse.json({ success: true, data: serializeRequest(created) }, { status: 201 });
}