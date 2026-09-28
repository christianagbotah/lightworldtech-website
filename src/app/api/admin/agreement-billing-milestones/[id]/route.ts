import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  amount: z.coerce.number().positive().max(999999999999).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(['planned', 'ready', 'waived']).optional(),
  notes: z.string().trim().max(4000).optional(),
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

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid billing milestone update', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.clientAgreementBillingMilestone.findUnique({
      where: { id },
      include: {
        agreement: {
          select: {
            id: true,
            organizationId: true,
            currency: true,
            contractValue: true,
            status: true,
            approvalStatus: true,
          },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!existing) return { milestone: null, error: 'Billing milestone not found', status: 404 };

    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-agreement-billing-schedule:' + existing.agreementId,
    );

    const hasLiveInvoice = existing.invoices.some((invoice) => invoice.status !== 'void');
    const materialChange =
      parsed.data.title !== undefined ||
      parsed.data.amount !== undefined ||
      parsed.data.dueDate !== undefined ||
      parsed.data.status !== undefined;

    if (hasLiveInvoice && materialChange) {
      return {
        milestone: null,
        error: 'A billing milestone linked to a non-void invoice is financially locked. Update notes only or manage the invoice through Finance.',
        status: 409,
      };
    }

    const nextStatus = parsed.data.status || existing.status;
    if (
      nextStatus === 'ready' &&
      (existing.agreement.status !== 'active' || existing.agreement.approvalStatus !== 'approved')
    ) {
      return {
        milestone: null,
        error: 'Only approved active agreements can have billing milestones marked Ready',
        status: 409,
      };
    }

    if (nextStatus === 'waived' && !(parsed.data.waiverReason || existing.waiverReason || '').trim()) {
      return { milestone: null, error: 'A waiver reason is required', status: 400 };
    }

    const nextAmount = parsed.data.amount !== undefined
      ? new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2)
      : existing.amount;

    if (nextStatus !== 'waived' && existing.agreement.contractValue.gt(0)) {
      const aggregate = await tx.clientAgreementBillingMilestone.aggregate({
        where: {
          agreementId: existing.agreementId,
          id: { not: existing.id },
          status: { not: 'waived' },
        },
        _sum: { amount: true },
      });
      const otherScheduled = aggregate._sum.amount || new Prisma.Decimal(0);
      const projected = otherScheduled.plus(nextAmount);
      if (projected.gt(existing.agreement.contractValue)) {
        return {
          milestone: null,
          error: 'Billing schedule would exceed the agreement contract value',
          status: 409,
          control: {
            currency: existing.agreement.currency,
            contractValue: existing.agreement.contractValue.toFixed(2),
            otherScheduled: otherScheduled.toFixed(2),
            projectedScheduled: projected.toFixed(2),
          },
        };
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.amount !== undefined) data.amount = nextAmount;
    if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      if (parsed.data.status === 'waived') {
        data.waiverReason = (parsed.data.waiverReason || existing.waiverReason).trim();
        data.waivedAt = new Date();
        data.waivedBy = actor.name || actor.email;
      } else {
        data.waiverReason = '';
        data.waivedAt = null;
        data.waivedBy = '';
      }
    }

    const milestone = await tx.clientAgreementBillingMilestone.update({
      where: { id },
      data,
      include: {
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, total: true, issueDate: true, dueDate: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return { milestone, agreement: existing.agreement, error: null, status: 200 };
  });

  if (!result.milestone) {
    return NextResponse.json(
      { success: false, error: result.error, billingControl: 'control' in result ? result.control : undefined },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_billing_milestone_updated',
    entity: 'ClientAgreement',
    entityId: result.milestone.agreementId,
    details: {
      organizationId: result.agreement.organizationId,
      milestoneId: result.milestone.id,
      fields: Object.keys(parsed.data),
      status: result.milestone.status,
      waiverReason: result.milestone.waiverReason,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result.milestone,
      amount: result.milestone.amount.toFixed(2),
      invoices: result.milestone.invoices.map((invoice) => ({ ...invoice, total: invoice.total.toFixed(2) })),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.clientAgreementBillingMilestone.findUnique({
    where: { id },
    include: {
      agreement: { select: { id: true, organizationId: true, currency: true } },
      invoices: { select: { id: true, invoiceNumber: true, status: true } },
    },
  });
  if (!existing) return NextResponse.json({ success: false, error: 'Billing milestone not found' }, { status: 404 });

  if (existing.invoices.length > 0) {
    return NextResponse.json(
      { success: false, error: 'A billing milestone with invoice history cannot be deleted. Waive or retain it for audit traceability.' },
      { status: 409 },
    );
  }

  await db.clientAgreementBillingMilestone.delete({ where: { id } });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_billing_milestone_deleted',
    entity: 'ClientAgreement',
    entityId: existing.agreementId,
    details: {
      organizationId: existing.agreement.organizationId,
      milestoneId: existing.id,
      title: existing.title,
      amount: existing.amount.toFixed(2),
      currency: existing.agreement.currency,
    },
  });

  return NextResponse.json({ success: true });
}
