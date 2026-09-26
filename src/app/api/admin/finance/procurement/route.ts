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
              select: { id: true, requestLineId: true, quantity: true },
            },
          },
        },
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

  return NextResponse.json({
    success: true,
    data: {
      canApprove: hasAdminPermission(actor.role, actor.permissions, 'finance.approve'),
      currentAdminId: actor.id,
      requests: requests.map(serializeRequest),
      orders: orders.map(serializeOrder),
      vendors,
      projects,
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
