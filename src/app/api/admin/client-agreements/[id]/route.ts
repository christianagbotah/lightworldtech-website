import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type ClientAgreement } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

class SupersessionConflictError extends Error {}

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
    approvalStatus: agreement.approvalStatus,
    approvalDecisionBy: agreement.approvalDecisionBy,
    approvalDecisionAt: agreement.approvalDecisionAt?.toISOString() || null,
    approvalNotes: agreement.approvalNotes,
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

  const nextStatus = parsed.data.status || existing.status;
  const nextContractValue = parsed.data.contractValue !== undefined
    ? new Prisma.Decimal(parsed.data.contractValue)
    : existing.contractValue;
  const nextContractValueBasis = parsed.data.contractValueBasis || existing.contractValueBasis;

  if (
    nextStatus === 'active' &&
    nextContractValue.gt(0) &&
    nextContractValueBasis === 'unspecified'
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Record whether the contract value is tax-inclusive or tax-exclusive before activating this agreement',
      },
      { status: 409 },
    );
  }

  const nextProjectId = parsed.data.projectId !== undefined
    ? parsed.data.projectId || null
    : existing.projectId;
  const nextCurrency = parsed.data.currency
    ? normalizeCurrency(parsed.data.currency)
    : normalizeCurrency(existing.currency);
  const projectChanged =
    parsed.data.projectId !== undefined &&
    nextProjectId !== existing.projectId;
  const currencyChanged =
    parsed.data.currency !== undefined &&
    nextCurrency !== normalizeCurrency(existing.currency);
  const contractValueChanged =
    parsed.data.contractValue !== undefined &&
    !new Prisma.Decimal(parsed.data.contractValue).eq(existing.contractValue);
  const contractValueBasisChanged =
    parsed.data.contractValueBasis !== undefined &&
    parsed.data.contractValueBasis !== existing.contractValueBasis;
  const materialCommercialChange =
    projectChanged || currencyChanged || contractValueChanged || contractValueBasisChanged;

  const legacyBasisCorrectionOnly =
    existing.status === 'active' &&
    existing.contractValueBasis === 'unspecified' &&
    parsed.data.contractValueBasis !== undefined &&
    parsed.data.contractValueBasis !== 'unspecified' &&
    !projectChanged &&
    !currencyChanged &&
    !contractValueChanged;

  if (existing.status === 'active' && materialCommercialChange && !legacyBasisCorrectionOnly) {
    return NextResponse.json(
      {
        success: false,
        error: 'Active agreement commercial terms cannot be changed in place. Terminate or supersede the agreement and use an approved replacement.',
      },
      { status: 409 },
    );
  }

  if (parsed.data.status === 'active' && materialCommercialChange) {
    return NextResponse.json(
      {
        success: false,
        error: 'Save the material commercial amendment first, then obtain a new approval decision before activation.',
      },
      { status: 409 },
    );
  }

  const requiresReapproval =
    existing.status !== 'active' &&
    materialCommercialChange &&
    ['approved', 'rejected'].includes(existing.approvalStatus);

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: existing.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Selected project does not belong to this client' }, { status: 400 });
  }

  const billingSchedule = await db.clientAgreementBillingMilestone.aggregate({
    where: { agreementId: id },
    _sum: { amount: true },
    _count: { id: true },
  });
  const scheduledAmount = billingSchedule._sum.amount || new Prisma.Decimal(0);

  if (
    parsed.data.contractValue !== undefined &&
    new Prisma.Decimal(parsed.data.contractValue).lt(scheduledAmount)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Contract value cannot be lower than the active billing schedule total',
        billingControl: {
          currency: existing.currency,
          scheduledAmount: scheduledAmount.toFixed(2),
        },
      },
      { status: 409 },
    );
  }

  if (
    parsed.data.currency &&
    normalizeCurrency(parsed.data.currency) !== normalizeCurrency(existing.currency) &&
    billingSchedule._count.id > 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Remove or revise billing milestones before changing the agreement currency',
      },
      { status: 409 },
    );
  }

  const activatingReplacement =
    parsed.data.status === 'active' &&
    existing.status !== 'active' &&
    Boolean(existing.supersedesAgreementId);

  if (activatingReplacement && existing.supersedesAgreementId) {
    const predecessor = await db.clientAgreement.findUnique({
      where: { id: existing.supersedesAgreementId },
      select: { id: true, organizationId: true, status: true },
    });
    if (!predecessor || predecessor.organizationId !== existing.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Replacement agreement predecessor is missing or belongs to another client' },
        { status: 409 },
      );
    }
    if (predecessor.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'The predecessor agreement must still be active when its replacement is activated' },
        { status: 409 },
      );
    }
  }

  const data = {
    ...parsed.data,
    ...(parsed.data.currency ? { currency: normalizeCurrency(parsed.data.currency) } : {}),
    ...(parsed.data.projectId !== undefined ? { projectId: parsed.data.projectId || null } : {}),
    ...(parsed.data.effectiveDate !== undefined ? { effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null } : {}),
    ...(parsed.data.expiryDate !== undefined ? { expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null } : {}),
    ...(parsed.data.signedAt !== undefined ? { signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : null } : {}),
    ...(requiresReapproval ? {
      approvalStatus: 'pending',
      approvalDecisionBy: '',
      approvalDecisionAt: null,
      approvalNotes: 'Material commercial terms changed after the previous approval decision; re-approval is required.',
    } : {}),
  };

  const beforeState = snapshot(existing);
  let supersededAgreementId: string | null = null;
  let agreement;
  try {
    agreement = await db.$transaction(async (tx) => {
      if (activatingReplacement && existing.supersedesAgreementId) {
        const predecessorUpdate = await tx.clientAgreement.updateMany({
          where: { id: existing.supersedesAgreementId, status: 'active' },
          data: { status: 'superseded' },
        });
        if (predecessorUpdate.count !== 1) {
          throw new SupersessionConflictError('Predecessor agreement is no longer active');
        }
        supersededAgreementId = existing.supersedesAgreementId;
        await tx.clientAgreementChange.create({
          data: {
            agreementId: existing.supersedesAgreementId,
            changedBy: actor.name || actor.email,
            changeType: 'superseded_by_replacement',
            fields: 'status,supersededByAgreementId',
            beforeState: { status: 'active', supersededByAgreementId: null },
            afterState: { status: 'superseded', supersededByAgreementId: existing.id },
          },
        });
      }

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
          changeType: requiresReapproval
            ? 'material_amendment'
            : parsed.data.status && parsed.data.status !== existing.status
              ? 'status_change'
              : legacyBasisCorrectionOnly
                ? 'legacy_basis_correction'
                : 'update',
          fields: fields.join(','),
          beforeState,
          afterState,
        },
      });
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof SupersessionConflictError) {
      return NextResponse.json(
        { success: false, error: 'The predecessor agreement changed before replacement activation. Refresh and review the agreement lineage.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (supersededAgreementId) {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_agreement_superseded_by_replacement',
      entity: 'ClientAgreement',
      entityId: supersededAgreementId,
      details: {
        organizationId: agreement.organizationId,
        replacementAgreementId: agreement.id,
      },
    });
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_agreement_updated',
    entity: 'ClientAgreement',
    entityId: agreement.id,
    details: {
      organizationId: agreement.organizationId,
      fields: Object.keys(parsed.data),
      materialCommercialChange,
      approvalReset: requiresReapproval,
      legacyBasisCorrectionOnly,
      supersededAgreementId,
    },
  });

  return NextResponse.json({
    success: true,
    data: agreement,
    governance: {
      materialCommercialChange,
      approvalReset: requiresReapproval,
      legacyBasisCorrectionOnly,
      supersededAgreementId,
    },
  });
}