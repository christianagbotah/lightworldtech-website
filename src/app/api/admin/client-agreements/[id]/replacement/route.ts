import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const source = await db.clientAgreement.findUnique({
    where: { id },
    include: {
      supersededByAgreement: {
        select: { id: true, title: true, status: true, referenceNumber: true },
      },
    },
  });
  if (!source) return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 });
  if (source.status !== 'active' || source.approvalStatus !== 'approved') {
    return NextResponse.json(
      { success: false, error: 'Only approved active agreements can start a replacement draft' },
      { status: 409 },
    );
  }
  if (source.supersededByAgreement) {
    return NextResponse.json(
      {
        success: false,
        error: 'A replacement agreement already exists for this agreement',
        replacement: source.supersededByAgreement,
      },
      { status: 409 },
    );
  }

  const changedBy = actor.name || actor.email;
  try {
    const replacement = await db.$transaction(async (tx) => {
      const created = await tx.clientAgreement.create({
        data: {
          organizationId: source.organizationId,
          projectId: source.projectId,
          supersedesAgreementId: source.id,
          title: source.title + ' · Replacement draft',
          agreementType: source.agreementType,
          status: 'draft',
          referenceNumber: '',
          currency: source.currency,
          contractValue: source.contractValue,
          contractValueBasis: source.contractValueBasis,
          effectiveDate: null,
          expiryDate: source.expiryDate,
          renewalNoticeDays: source.renewalNoticeDays,
          owner: source.owner,
          documentUrl: '',
          notes:
            'Replacement draft for ' +
            (source.referenceNumber || source.title) +
            '. Review all commercial terms, dates, billing schedule, obligations and approvals before activation.' +
            (source.notes ? '\n\nPrevious agreement notes for reference:\n' + source.notes : ''),
          signedAt: null,
        },
      });

      await tx.clientAgreementChange.createMany({
        data: [
          {
            agreementId: source.id,
            changedBy,
            changeType: 'replacement_draft_created',
            fields: 'supersededByAgreementId',
            beforeState: { supersededByAgreementId: null },
            afterState: { supersededByAgreementId: created.id },
          },
          {
            agreementId: created.id,
            changedBy,
            changeType: 'replacement_draft_created',
            fields: 'supersedesAgreementId',
            beforeState: { supersedesAgreementId: null },
            afterState: { supersedesAgreementId: source.id },
          },
        ],
      });

      return created;
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_agreement_replacement_draft_created',
      entity: 'ClientAgreement',
      entityId: replacement.id,
      details: {
        organizationId: replacement.organizationId,
        supersedesAgreementId: source.id,
        sourceReferenceNumber: source.referenceNumber,
        commitmentsCloned: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: replacement,
      governance: {
        sourceAgreementId: source.id,
        sourceRemainsActive: true,
        commitmentsCloned: false,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.clientAgreement.findFirst({
        where: { supersedesAgreementId: source.id },
        select: { id: true, title: true, status: true, referenceNumber: true },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'A replacement agreement already exists for this agreement',
          replacement: existing,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
