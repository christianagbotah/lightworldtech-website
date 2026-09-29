import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  title: z.string().trim().min(2).max(220),
  amount: z.coerce.number().positive().max(999999999999),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(4000).optional().default(''),
  visibleToClient: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid billing milestone', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id: agreementId } = await params;
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-agreement-billing-schedule:' + agreementId,
    );

    const agreement = await tx.clientAgreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        organizationId: true,
        title: true,
        currency: true,
        contractValue: true,
      },
    });
    if (!agreement) return { milestone: null, error: 'Agreement not found', status: 404 };

    if (agreement.contractValue.lte(0)) {
      return { milestone: null, error: 'Record a positive agreement contract value before scheduling billing milestones', status: 409 };
    }

    const [aggregate, count] = await Promise.all([
      tx.clientAgreementBillingMilestone.aggregate({
        where: { agreementId },
        _sum: { amount: true },
      }),
      tx.clientAgreementBillingMilestone.count({ where: { agreementId } }),
    ]);

    const scheduled = aggregate._sum.amount || new Prisma.Decimal(0);
    const amount = new Prisma.Decimal(parsed.data.amount).toDecimalPlaces(2);
    const projected = scheduled.plus(amount);
    if (projected.gt(agreement.contractValue)) {
      return {
        milestone: null,
        error: 'Billing schedule would exceed the agreement contract value',
        status: 409,
        control: {
          currency: agreement.currency,
          contractValue: agreement.contractValue.toFixed(2),
          currentlyScheduled: scheduled.toFixed(2),
          projectedScheduled: projected.toFixed(2),
        },
      };
    }

    const milestone = await tx.clientAgreementBillingMilestone.create({
      data: {
        agreementId,
        title: parsed.data.title,
        amount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        order: count,
        notes: parsed.data.notes,
        visibleToClient: parsed.data.visibleToClient,
        createdBy: actor.name || actor.email,
      },
    });

    return { milestone, agreement, error: null, status: 201 };
  });

  if (!result.milestone) {
    return NextResponse.json(
      { success: false, error: result.error, billingControl: 'control' in result ? result.control : undefined },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_billing_milestone_created',
    entity: 'ClientAgreement',
    entityId: agreementId,
    details: {
      organizationId: result.agreement.organizationId,
      milestoneId: result.milestone.id,
      title: result.milestone.title,
      amount: result.milestone.amount.toFixed(2),
      currency: result.agreement.currency,
      dueDate: result.milestone.dueDate?.toISOString() || null,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result.milestone,
      amount: result.milestone.amount.toFixed(2),
    },
  }, { status: 201 });
}
