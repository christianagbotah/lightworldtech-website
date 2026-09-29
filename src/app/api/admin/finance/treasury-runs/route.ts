import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, nextTreasuryRunNumber, normalizeCurrency } from '@/lib/finance';
import { parseApprovalAllocations } from '@/lib/finance-approvals';

const createSchema = z.object({
  currency: z.string().trim().min(3).max(3).default('GHS'),
  plannedDate: z.coerce.date(),
  dueThrough: z.coerce.date(),
  sourceSystemKey: z.enum(['cash', 'bank', 'mobile_money']),
  sourceLabel: z.string().trim().min(2).max(160),
  sourceReference: z.string().trim().max(160).default(''),
  vendorId: z.string().trim().max(100).default(''),
  notes: z.string().trim().max(4000).default(''),
});

function serialize(run: any) {
  const lines = (run.lines || []).map((line: any) => ({
    ...line,
    amount: line.amount.toFixed(2),
  }));
  const total = lines.reduce((sum: Prisma.Decimal, line: any) => sum.plus(line.amount), new Prisma.Decimal(0));
  return {
    ...run,
    totalAmount: total.toFixed(2),
    lineCount: lines.length,
    vendorCount: new Set(lines.map((line: any) => line.vendorId)).size,
    lines,
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const runs = await db.financeTreasuryPaymentRun.findMany({
    include: { lines: { orderBy: [{ dueDate: 'asc' }, { payableNumber: 'asc' }] } },
    orderBy: [{ plannedDate: 'desc' }, { createdAt: 'desc' }],
    take: 250,
  });
  return NextResponse.json({ success: true, data: runs.map(serialize) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid treasury payment run', details: parsed.error.flatten() }, { status: 400 });
  }

  const currency = normalizeCurrency(parsed.data.currency);
  const bills = await db.financeVendorBill.findMany({
    where: {
      currency,
      dueDate: { lte: parsed.data.dueThrough },
      status: { notIn: ['draft', 'rejected', 'paid', 'void'] },
      ...(parsed.data.vendorId ? { vendorId: parsed.data.vendorId } : {}),
      vendor: { active: true },
      attachments: { some: {} },
    },
    include: {
      vendor: { select: { id: true, name: true } },
      allocations: true,
    },
    orderBy: [{ dueDate: 'asc' }, { payableNumber: 'asc' }],
    take: 1000,
  });

  const [pendingApprovals, reservedRunLines] = await Promise.all([
    db.financeOutflowApproval.findMany({
      where: { outflowType: 'vendor_payment', status: { in: ['pending', 'scheduled'] }, currency },
      select: { allocationsJson: true },
    }),
    db.financeTreasuryPaymentRunLine.findMany({
      where: {
        status: { in: ['planned', 'submitted'] },
        run: { status: { in: ['draft', 'submitted'] }, currency },
      },
      select: { billId: true, amount: true },
    }),
  ]);

  const approvalReserved = new Map<string, Prisma.Decimal>();
  for (const approval of pendingApprovals) {
    for (const allocation of parseApprovalAllocations(approval.allocationsJson)) {
      approvalReserved.set(
        allocation.billId,
        (approvalReserved.get(allocation.billId) || new Prisma.Decimal(0)).plus(allocation.amount),
      );
    }
  }
  const runReserved = new Map<string, Prisma.Decimal>();
  for (const line of reservedRunLines) {
    runReserved.set(line.billId, (runReserved.get(line.billId) || new Prisma.Decimal(0)).plus(line.amount));
  }

  const lines = bills.flatMap((bill) => {
    const available = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoiceBalance(bill.total, bill.allocations)
        .minus(approvalReserved.get(bill.id) || 0)
        .minus(runReserved.get(bill.id) || 0),
    ).toDecimalPlaces(2);
    if (available.lte(0)) return [];
    return [{
      billId: bill.id,
      vendorId: bill.vendorId,
      vendorName: bill.vendor.name,
      payableNumber: bill.payableNumber,
      dueDate: bill.dueDate,
      amount: available,
    }];
  });

  if (!lines.length) {
    return NextResponse.json(
      { success: false, error: 'No unreserved supplier balances with invoice evidence are due in this planning window' },
      { status: 409 },
    );
  }

  const runNumber = await nextTreasuryRunNumber(parsed.data.plannedDate);
  const run = await db.financeTreasuryPaymentRun.create({
    data: {
      runNumber,
      status: 'draft',
      currency,
      plannedDate: parsed.data.plannedDate,
      dueThrough: parsed.data.dueThrough,
      sourceSystemKey: parsed.data.sourceSystemKey,
      sourceLabel: parsed.data.sourceLabel,
      sourceReference: parsed.data.sourceReference,
      notes: parsed.data.notes,
      preparedByAdminId: actor.id,
      preparedByName: actor.name || 'Admin',
      preparedByEmail: actor.email,
      lines: { create: lines },
    },
    include: { lines: { orderBy: [{ dueDate: 'asc' }, { payableNumber: 'asc' }] } },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_treasury_payment_run_created',
    entity: 'FinanceTreasuryPaymentRun',
    entityId: run.id,
    details: {
      runNumber,
      currency,
      plannedDate: run.plannedDate.toISOString(),
      dueThrough: run.dueThrough.toISOString(),
      sourceSystemKey: run.sourceSystemKey,
      lineCount: run.lines.length,
      totalAmount: run.lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0)).toFixed(2),
    },
  });

  return NextResponse.json({ success: true, data: serialize(run) }, { status: 201 });
}