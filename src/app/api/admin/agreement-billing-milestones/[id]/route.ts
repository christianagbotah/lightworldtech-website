import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  amount: z.coerce.number().positive().max(999999999999).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(['planned', 'ready', 'waived']).optional(),
  notes: z.string().trim().max(5000).optional(),
  waiverReason: z.string().trim().max(1200).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid billing milestone update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const current = await db.clientAgreementBillingMilestone.findUnique({
    where: { id },
    include: {
      agreement: {
        select: {
          id: true,
          organizationId: true,
          projectId: true,
          title: true,
          status: true,
          approvalStatus: true,
          currency: true,
          contractValue: true,
        },
      },
      invoice: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });
  if (!current) return NextResponse.json({ success: false, error: 'Billing milestone not found' }, { status: 404 });

  const materialChange =
    parsed.data.title !== undefined ||
    parsed.data.amount !== undefined ||
    parsed.data.dueDate !== undefined ||
    parsed.data.status !== undefined;

  if (current.invoiceId && materialChange) {
    return NextResponse.json(
      {
        success: false,
        error: 'An invoiced billing milestone is financially locked. Update notes only or revise the invoice through Finance controls.',
      },
      { status: 409 },
    );
  }

  if (parsed.data.status === 'ready' &&
      (current.agreement.status !== 'active' || current.agreement.approvalStatus !== 'approved')) {
    return NextResponse.json(
      { success: false, error: 'Only approved active agreements can have billing milestones marked Ready' },
      { status: 409 },
    );
  }

  if (parsed.data.status === 'waived' && !(parsed.data.waiverReason || '').trim()) {
    return NextResponse.json(
      { success: false, error: 'A waiver reason is required' },
      { status: 400 },
    );
  }

  if (parsed.data.amount !== undefined && current.agreement.contractValue.gt(0)) {
    const others = await db.clientAgreementBillingMilestone.findMany({
      where: {
        agreementId: current.agreementId,
        id: { not: current.id },
        status: { not: 'waived' },
      },
      select: { amount: true },
    });
    const scheduledElsewhere = others.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const nextTotal = scheduledElsewhere.plus(parsed.data.amount);
    if (nextTotal.gt(current.agreement.contractValue)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Billing schedule would exceed the recorded agreement value',
          contractValue: current.agreement.contractValue.toFixed(2),
          scheduledElsewhere: scheduledElsewhere.toFixed(2),
        },
        { status: 409 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === 'waived') {
      data.waiverReason = parsed.data.waiverReason!.trim();
      data.waivedAt = new Date();
      data.waivedBy = actor.name || actor.email;
    } else {
      data.waiverReason = '';
      data.waivedAt = null;
      data.waivedBy = '';
    }
  }

  const milestone = await db.clientAgreementBillingMilestone.update({
    where: { id: current.id },
    data,
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          issueDate: true,
          dueDate: true,
        },
      },
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_billing_milestone_updated',
    entity: 'ClientAgreement',
    entityId: current.agreementId,
    details: {
      organizationId: current.agreement.organizationId,
      projectId: current.agreement.projectId,
      agreementTitle: current.agreement.title,
      milestoneId: current.id,
      previousStatus: current.status,
      status: milestone.status,
      amount: milestone.amount.toFixed(2),
      currency: current.agreement.currency,
      invoiceId: milestone.invoiceId,
      waiverReason: milestone.waiverReason,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...milestone,
      amount: milestone.amount.toFixed(2),
      invoice: milestone.invoice ? {
        ...milestone.invoice,
        total: milestone.invoice.total.toFixed(2),
      } : null,
    },
  });
}
