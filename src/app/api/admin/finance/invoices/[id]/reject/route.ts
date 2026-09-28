import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { getFinanceApprovalPolicy } from '@/lib/finance-approvals';

const schema = z.object({
  reason: z.string().trim().min(3).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.approve')
  ) {
    return NextResponse.json(
      { success: false, error: 'Finance approval permission is required' },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'A rejection reason of at least 3 characters is required' },
      { status: 400 },
    );
  }

  const { id } = await params;
  const policy = await getFinanceApprovalPolicy();

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-invoice-lifecycle:' + id,
    );

    const invoice = await tx.clientInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        createdByAdminId: true,
        createdBy: true,
        organizationId: true,
        agreementId: true,
        billingMilestoneId: true,
      },
    });

    if (!invoice) {
      return { invoice: null, error: 'Invoice not found', status: 404 };
    }
    if (invoice.status !== 'draft') {
      return {
        invoice: null,
        error: 'Only draft invoices can be rejected',
        status: 409,
      };
    }
    if (
      policy?.enabled &&
      policy.requireSecondApprover &&
      invoice.createdByAdminId &&
      invoice.createdByAdminId === actor.id
    ) {
      return {
        invoice: null,
        error: 'Maker-checker prevents the invoice preparer from rejecting their own draft',
        status: 409,
      };
    }

    const rejected = await tx.clientInvoice.update({
      where: { id },
      data: {
        status: 'void',
        rejectedByAdminId: actor.id,
        rejectedBy: actor.name || actor.email,
        rejectedAt: new Date(),
        rejectionReason: parsed.data.reason,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        rejectedByAdminId: true,
        rejectedBy: true,
        rejectedAt: true,
        rejectionReason: true,
        agreementId: true,
        billingMilestoneId: true,
      },
    });

    return { invoice: rejected, error: '', status: 200 };
  });

  if (!result.invoice) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_invoice_draft_rejected',
    entity: 'ClientInvoice',
    entityId: result.invoice.id,
    details: {
      invoiceNumber: result.invoice.invoiceNumber,
      reason: result.invoice.rejectionReason,
      agreementId: result.invoice.agreementId,
      billingMilestoneId: result.invoice.billingMilestoneId,
      replacementAllowed: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: result.invoice,
  });
}
