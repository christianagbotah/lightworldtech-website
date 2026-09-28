import { NextRequest, NextResponse } from 'next/server';
import type { ClientAgreement } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  agreementType: z.enum(['contract', 'statement_of_work', 'service_agreement', 'nda', 'license', 'other']).optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'superseded']).optional(),
  referenceNumber: z.string().trim().max(120).optional(),
  projectId: z.string().trim().nullable().optional(),
  currency: z.string().trim().max(3).optional(),
  contractValue: z.coerce.number().min(0).max(999999999999).optional(),
  contractValueBasis: z.enum(['unspecified', 'tax_exclusive', 'tax_inclusive']).optional(),
  effectiveDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  owner: z.string().trim().max(180).optional(),
  documentUrl: z.string().trim().url().or(z.literal('')).optional(),
  notes: z.string().trim().max(8000).optional(),
  signedAt: z.string().datetime().nullable().optional(),
});

function snapshot(agreement: ClientAgreement) {
  return {
    title: agreement.title,
    agreementType: agreement.agreementType,
    status: agreement.status,
    referenceNumber: agreement.referenceNumber,
    projectId: agreement.projectId,
    currency: agreement.currency,
    contractValue: agreement.contractValue.toString(),
    contractValueBasis: agreement.contractValueBasis,
    effectiveDate: agreement.effectiveDate?.toISOString() || null,
    expiryDate: agreement.expiryDate?.toISOString() || null,
    renewalNoticeDays: agreement.renewalNoticeDays,
    owner: agreement.owner,
    documentUrl: agreement.documentUrl,
    notes: agreement.notes,
    signedAt: agreement.signedAt?.toISOString() || null,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid agreement update', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.clientAgreement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

  if (parsed.data.status === 'active' && existing.approvalStatus !== 'approved') {
    return NextResponse.json(
      { success: false, error: 'Agreement must be approved by an authorized administrator before activation' },
      { status: 409 },
    );
  }

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: existing.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Selected project does not belong to this client' }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    ...(parsed.data.currency ? { currency: normalizeCurrency(parsed.data.currency) } : {}),
    ...(parsed.data.projectId !== undefined ? { projectId: parsed.data.projectId || null } : {}),
    ...(parsed.data.effectiveDate !== undefined ? { effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null } : {}),
    ...(parsed.data.expiryDate !== undefined ? { expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null } : {}),
    ...(parsed.data.signedAt !== undefined ? { signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : null } : {}),
  };

  const beforeState = snapshot(existing);
  const agreement = await db.$transaction(async (tx) => {
    const updated = await tx.clientAgreement.update({ where: { id }, data });
    const afterState = snapshot(updated);
    const fields = Object.keys(afterState).filter(
      (key) => JSON.stringify(beforeState[key as keyof typeof beforeState]) !== JSON.stringify(afterState[key as keyof typeof afterState]),
    );

    if (fields.length) {
      await tx.clientAgreementChange.create({
        data: {
          agreementId: id,
          changedBy: actor.name || actor.email,
          changeType: parsed.data.status && parsed.data.status !== existing.status ? 'status_change' : 'update',
          fields: fields.join(','),
          beforeState,
          afterState,
        },
      });
    }
    return updated;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_updated',
    entity: 'ClientAgreement',
    entityId: agreement.id,
    details: { organizationId: agreement.organizationId, fields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ success: true, data: agreement });
}