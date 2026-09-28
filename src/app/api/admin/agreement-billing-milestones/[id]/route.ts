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
  notes: z.string().trim().max(4000).optional(),
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
          },
        },
        invoices: {
          where: { status: { not: 'void' } },
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
    });
    if (!existing) return { milestone: null, error: 'Billing milestone not found', status: 404 };

    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-agreement-billing-schedule:' + existing.agreementId,
    );

    if (
      parsed.data.amount !== undefined &&
      new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2).neq(existing.amount) &&
      existing.invoices.length > 0
    ) {
      return {
        milestone: null,
        error: 'Milestone amount cannot change while a non-void invoice is linked',
        status: 409,
        existingInvoice: existing.invoices[0],
      };
    }

    if (parsed.data.amount !== undefined) {
      const aggregate = await tx.clientAgreementBillingMilestone.aggregate({
        where: {
          agreementId: existing.agreementId,
          id: { not: existing.id },
        },
        _sum: { amount: true },
      });
      const otherScheduled = aggregate._sum.amount || new Prisma.Decimal(0);
      const amount = new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2);
      const projected = otherScheduled.plus(amount);
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

    const milestone = await tx.clientAgreementBillingMilestone.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.amount !== undefined
          ? { amount: new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2) }
          : {}),
        ...(parsed.data.dueDate !== undefined
          ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null }
          : {}),
      },
    });

    return { milestone, agreement: existing.agreement, error: null, status: 200 };
  });

  if (!result.milestone) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        billingControl: 'control' in result ? result.control : undefined,
        existingInvoice: 'existingInvoice' in result ? result.existingInvoice : undefined,
      },
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
    },
  });

  return NextResponse.json({
    success: true,
    data: { ...result.milestone, amount: result.milestone.amount.toFixed(2) },
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
      invoices: {
        select: { id: true, invoiceNumber: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!existing) return NextResponse.json({ success: false, error: 'Billing milestone not found' }, { status: 404 });
  if (existing.invoices.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Billing milestone cannot be deleted because invoice history is linked to it',
        existingInvoice: existing.invoices[0],
      },
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
