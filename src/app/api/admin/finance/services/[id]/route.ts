import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  projectId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(180).optional(),
  serviceType: z.string().trim().min(2).max(80).optional(),
  planName: z.string().trim().max(120).optional(),
  status: z.enum(['pending', 'active', 'suspended', 'expired', 'cancelled']).optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom']).optional(),
  currency: z.string().trim().max(3).optional(),
  recurringAmount: z.coerce.number().min(0).max(999999999999).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  nextDueDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  notes: z.string().trim().max(8000).optional(),
  changeType: z.enum(['upgrade', 'downgrade', 'renewal', 'price_change', 'suspension', 'resumption', 'correction']).optional(),
  changeNotes: z.string().trim().max(8000).default(''),
}).refine((value) => Object.keys(value).some((key) => !['changeType', 'changeNotes'].includes(key)), 'At least one service change is required');

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid service update', details: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const current = await db.clientServiceAccount.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: current.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ success: false, error: 'Project does not belong to this client' }, { status: 400 });
  }

  const { changeType, changeNotes, ...patch } = parsed.data;
  const data = {
    ...patch,
    ...(patch.currency ? { currency: normalizeCurrency(patch.currency) } : {}),
  };

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.clientServiceAccount.update({ where: { id }, data });
    await tx.clientServiceChange.create({
      data: {
        serviceId: id,
        changeType: changeType || (patch.status && patch.status !== current.status ? patch.status : 'correction'),
        previousPlan: current.planName,
        newPlan: result.planName,
        previousAmount: current.recurringAmount,
        newAmount: result.recurringAmount,
        effectiveAt: new Date(),
        notes: changeNotes || '',
        changedBy: actor.name || actor.email,
      },
    });
    return result;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_service_updated',
    entity: 'ClientServiceAccount',
    entityId: id,
    details: { changedFields: Object.keys(data), changeType: changeType || 'correction' },
  });

  return NextResponse.json({ success: true, data: { ...updated, recurringAmount: updated.recurringAmount.toFixed(2) } });
}
