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
  status: z.enum(['planned', 'ready']).optional().default('planned'),
  notes: z.string().trim().max(5000).optional().default(''),
});

export async function POST(
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
      { success: false, error: 'Invalid billing milestone', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const agreement = await db.clientAgreement.findUnique({
    where: { id },
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
  });
  if (!agreement) return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 });
  if (['terminated', 'superseded', 'expired'].includes(agreement.status)) {
    return NextResponse.json(
      { success: false, error: 'Billing milestones cannot be added to a closed agreement' },
      { status: 409 },
    );
  }
  if (parsed.data.status === 'ready' && (agreement.status !== 'active' || agreement.approvalStatus !== 'approved')) {
    return NextResponse.json(
      { success: false, error: 'Only approved active agreements can have billing milestones marked Ready' },
      { status: 409 },
    );
  }

  const milestone = await db.$transaction(async (tx) => {
    const existing = await tx.clientAgreementBillingMilestone.findMany({
      where: { agreementId: agreement.id, status: { not: 'waived' } },
      select: { amount: true },
    });
    const scheduled = existing.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const nextTotal = scheduled.plus(parsed.data.amount);
    if (agreement.contractValue.gt(0) && nextTotal.gt(agreement.contractValue)) {
      throw new Error(
        'BILLING_SCHEDULE_EXCEEDS_CONTRACT:' +
        agreement.contractValue.toFixed(2) +
        ':' +
        scheduled.toFixed(2),
      );
    }

    return tx.clientAgreementBillingMilestone.create({
      data: {
        agreementId: agreement.id,
        title: parsed.data.title,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: parsed.data.status,
        notes: parsed.data.notes,
        createdBy: actor.name || actor.email,
      },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message.startsWith('BILLING_SCHEDULE_EXCEEDS_CONTRACT:')) {
      const [, contractValue, scheduled] = error.message.split(':');
      return { __error: true as const, contractValue, scheduled };
    }
    throw error;
  });

  if ('__error' in milestone) {
    return NextResponse.json(
      {
        success: false,
        error: 'Billing schedule would exceed the recorded agreement value',
        contractValue: milestone.contractValue,
        scheduled: milestone.scheduled,
      },
      { status: 409 },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_billing_milestone_created',
    entity: 'ClientAgreement',
    entityId: agreement.id,
    details: {
      organizationId: agreement.organizationId,
      projectId: agreement.projectId,
      agreementTitle: agreement.title,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      amount: milestone.amount.toFixed(2),
      currency: agreement.currency,
      dueDate: milestone.dueDate?.toISOString() || null,
      status: milestone.status,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...milestone,
      amount: milestone.amount.toFixed(2),
    },
  }, { status: 201 });
}
