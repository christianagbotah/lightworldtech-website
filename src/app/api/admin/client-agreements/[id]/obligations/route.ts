import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission, normalizeAdminPermissions } from '@/lib/admin-permissions';

const createSchema = z.object({
  title: z.string().trim().min(2).max(260),
  category: z.enum(['general', 'delivery', 'payment', 'support', 'security', 'compliance', 'renewal', 'reporting', 'other']).default('general'),
  owner: z.string().trim().max(180).optional().default(''),
  ownerAdminId: z.string().trim().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(8000).optional().default(''),
  evidenceUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
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
  const agreement = await db.clientAgreement.findUnique({
    where: { id },
    select: { id: true, organizationId: true, title: true },
  });
  if (!agreement) {
    return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid obligation', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  let ownerAdmin: { id: string; name: string; email: string; role: string; permissions: string } | null = null;
  if (parsed.data.ownerAdminId) {
    ownerAdmin = await db.admin.findFirst({
      where: { id: parsed.data.ownerAdminId, active: true },
      select: { id: true, name: true, email: true, role: true, permissions: true },
    });
    if (
      !ownerAdmin ||
      (
        ownerAdmin.role !== 'super_admin' &&
        !normalizeAdminPermissions(ownerAdmin.permissions).includes('clients.manage')
      )
    ) {
      return NextResponse.json({ success: false, error: 'Selected obligation owner is not an active client operator' }, { status: 400 });
    }
  }

  const obligation = await db.clientAgreementObligation.create({
    data: {
      agreementId: agreement.id,
      title: parsed.data.title,
      category: parsed.data.category,
      owner: ownerAdmin ? (ownerAdmin.name || ownerAdmin.email) : parsed.data.owner,
      ownerAdminId: ownerAdmin?.id || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes,
      evidenceUrl: parsed.data.evidenceUrl,
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_obligation_created',
    entity: 'ClientAgreement',
    entityId: agreement.id,
    details: {
      organizationId: agreement.organizationId,
      agreementTitle: agreement.title,
      obligationId: obligation.id,
      category: obligation.category,
      ownerAdminId: obligation.ownerAdminId,
      owner: obligation.owner,
      dueDate: obligation.dueDate?.toISOString() || null,
    },
  });

  return NextResponse.json({ success: true, data: obligation }, { status: 201 });
}