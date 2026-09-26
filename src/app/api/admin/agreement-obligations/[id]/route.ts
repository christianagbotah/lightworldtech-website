import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(260).optional(),
  category: z.enum(['general', 'delivery', 'payment', 'support', 'security', 'compliance', 'renewal', 'reporting', 'other']).optional(),
  owner: z.string().trim().max(180).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'waived']).optional(),
  notes: z.string().trim().max(8000).optional(),
  evidenceUrl: z.string().trim().url().or(z.literal('')).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid obligation update', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.clientAgreementObligation.findUnique({
    where: { id },
    include: { agreement: { select: { id: true, organizationId: true, title: true } } },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Agreement obligation not found' }, { status: 404 });
  }
  const completing = parsed.data.status === 'completed';
  const reopening = parsed.data.status && parsed.data.status !== 'completed';

  const obligation = await db.clientAgreementObligation.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.dueDate !== undefined
        ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null }
        : {}),
      ...(completing
        ? { completedAt: new Date(), completedBy: actor.name || actor.email }
        : reopening
          ? { completedAt: null, completedBy: '' }
          : {}),
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_obligation_updated',
    entity: 'ClientAgreement',
    entityId: existing.agreement.id,
    details: {
      organizationId: existing.agreement.organizationId,
      agreementTitle: existing.agreement.title,
      obligationId: obligation.id,
      fields: Object.keys(parsed.data),
      status: obligation.status,
    },
  });

  return NextResponse.json({ success: true, data: obligation });
}