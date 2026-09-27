import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance } from '@/lib/finance';
import { createOutflowApproval, getFinanceApprovalPolicy, parseApprovalAllocations } from '@/lib/finance-approvals';

function paymentMethod(sourceSystemKey: string) {
  if (sourceSystemKey === 'cash') return 'cash';
  if (sourceSystemKey === 'mobile_money') return 'mobile_money';
  return 'bank_transfer';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const run = await db.financeTreasuryPaymentRun.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          bill: {
            include: {
              allocations: true,
              attachments: { select: { id: true }, take: 1 },
              vendor: { select: { id: true, name: true, active: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { payableNumber: 'asc' }],
      },
    },
  });
  if (!run) return NextResponse.json({ success: false, error: 'Treasury payment run not found' }, { status: 404 });
  if (run.status !== 'draft') return NextResponse.json({ success: false, error: 'Only draft treasury runs can be submitted' }, { status: 409 });
  if (!run.lines.length) return NextResponse.json({ success: false, error: 'Treasury payment run has no payable lines' }, { status: 409 });

  const policy = await getFinanceApprovalPolicy();
  if (!policy?.enabled) {
    return NextResponse.json(
      { success: false, error: 'Enable finance maker-checker approval before submitting a treasury payment run' },
      { status: 409 },
    );
  }

  const pendingApprovals = await db.financeOutflowApproval.findMany({
    where: { outflowType: 'vendor_payment', status: 'pending', currency: run.currency },
    select: { allocationsJson: true },
  });
  const reserved = new Map<string, Prisma.Decimal>();
  for (const approval of pendingApprovals) {
    for (const allocation of parseApprovalAllocations(approval.allocationsJson)) {
      reserved.set(allocation.billId, (reserved.get(allocation.billId) || new Prisma.Decimal(0)).plus(allocation.amount));
    }
  }

  for (const line of run.lines) {
    if (!line.bill.vendor.active) return NextResponse.json({ success: false, error: 'Supplier is no longer active for ' + line.payableNumber }, { status: 409 });
    if (!line.bill.attachments.length) return NextResponse.json({ success: false, error: 'Supplier invoice evidence is missing for ' + line.payableNumber }, { status: 409 });
    if (line.bill.status === 'void' || line.bill.status === 'paid') return NextResponse.json({ success: false, error: line.payableNumber + ' is no longer payable' }, { status: 409 });
    if (line.bill.currency !== run.currency) return NextResponse.json({ success: false, error: 'Currency changed on ' + line.payableNumber }, { status: 409 });
    const available = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoiceBalance(line.bill.total, line.bill.allocations).minus(reserved.get(line.billId) || 0),
    );
    if (line.amount.gt(available)) {
      return NextResponse.json({ success: false, error: 'Treasury run is stale because the available balance changed on ' + line.payableNumber }, { status: 409 });
    }
  }

  const groups = new Map<string, typeof run.lines>();
  for (const line of run.lines) {
    const items = groups.get(line.vendorId) || [];
    items.push(line);
    groups.set(line.vendorId, items);
  }

  const approvals: Array<{ id: string; requestNumber: string; vendorId: string; vendorName: string; amount: string }> = [];
  for (const [vendorId, lines] of groups) {
    const amount = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    const approval = await createOutflowApproval(actor, {
      outflowType: 'vendor_payment',
      counterpartyId: vendorId,
      counterpartyName: lines[0].vendorName,
      sourceId: run.id,
      sourceReference: run.runNumber + ': ' + lines.map((line) => line.payableNumber).join(', '),
      currency: run.currency,
      amount,
      effectiveDate: run.plannedDate,
      method: paymentMethod(run.sourceSystemKey),
      reference: run.sourceReference,
      reason: ['Treasury payment run ' + run.runNumber, run.sourceLabel ? 'Source: ' + run.sourceLabel : '', run.notes].filter(Boolean).join(' · '),
      allocations: lines.map((line) => ({ billId: line.billId, amount: Number(line.amount.toFixed(2)) })),
    });
    await db.financeTreasuryPaymentRunLine.updateMany({
      where: { runId: run.id, vendorId },
      data: { status: 'submitted', approvalId: approval.id },
    });
    approvals.push({ id: approval.id, requestNumber: approval.requestNumber, vendorId, vendorName: lines[0].vendorName, amount: amount.toFixed(2) });
  }

  const updated = await db.financeTreasuryPaymentRun.update({
    where: { id: run.id },
    data: {
      status: 'submitted',
      submittedByAdminId: actor.id,
      submittedByName: actor.name || 'Admin',
      submittedByEmail: actor.email,
      submittedAt: new Date(),
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_treasury_payment_run_submitted',
    entity: 'FinanceTreasuryPaymentRun',
    entityId: run.id,
    details: { runNumber: run.runNumber, approvalCount: approvals.length, approvals, sourceSystemKey: run.sourceSystemKey, plannedDate: run.plannedDate.toISOString() },
  });

  return NextResponse.json({ success: true, data: { run: updated, approvals } });
}