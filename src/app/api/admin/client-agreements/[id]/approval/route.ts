import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const schema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().trim().max(4000).optional().default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid approval decision', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.clientAgreement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 });
  if (existing.status === 'active') {
    return NextResponse.json({ success: false, error: 'Active agreements cannot be re-decided; terminate or supersede the agreement instead' }, { status: 409 });
  }

  const decidedAt = new Date();
  const agreement = await db.$transaction(async (tx) => {
    const updated = await tx.clientAgreement.update({
      where: { id },
      data: {
        approvalStatus: parsed.data.decision,
        approvalDecisionBy: actor.name || actor.email,
        approvalDecisionAt: decidedAt,
        approvalNotes: parsed.data.notes,
      },
    });

    await tx.clientAgreementChange.create({
      data: {
        agreementId: id,
        changedBy: actor.name || actor.email,
        changeType: 'approval_decision',
        fields: 'approvalStatus,approvalDecisionBy,approvalDecisionAt,approvalNotes',
        beforeState: {
          approvalStatus: existing.approvalStatus,
          approvalDecisionBy: existing.approvalDecisionBy,
          approvalDecisionAt: existing.approvalDecisionAt?.toISOString() || null,
          approvalNotes: existing.approvalNotes,
        },
        afterState: {
          approvalStatus: updated.approvalStatus,
          approvalDecisionBy: updated.approvalDecisionBy,
          approvalDecisionAt: updated.approvalDecisionAt?.toISOString() || null,
          approvalNotes: updated.approvalNotes,
        },
      },
    });
    return updated;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_approval_decided',
    entity: 'ClientAgreement',
    entityId: agreement.id,
    details: {
      organizationId: agreement.organizationId,
      decision: agreement.approvalStatus,
    },
  });

  return NextResponse.json({ success: true, data: agreement });
}