import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance, invoiceStatusFromBalance } from '@/lib/finance';
import {
  calculateRenewedServiceDates,
  supportsAutomaticRenewalCycle,
} from '@/lib/service-renewal';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const completedBy = actor.name || actor.email;
  const completedAt = new Date();

  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'lightworld-project-renewal-completion:' + id,
      );

      const invoice = await tx.clientInvoice.findUnique({
        where: { id },
        include: {
          allocations: true,
          creditNotes: { where: { status: 'posted' } },
          project: true,
        },
      });

      if (!invoice) throw new Error('Renewal invoice not found');
      if (!invoice.projectId || !invoice.project || !invoice.renewalForDate) {
        throw new Error('This invoice is not a project renewal invoice');
      }
      if (invoice.serviceId) {
        throw new Error('Service-linked renewals must be completed from the service renewal workflow');
      }
      if (['draft', 'void'].includes(invoice.status)) {
        throw new Error('Draft or void invoices cannot complete a project renewal');
      }

      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      const derivedStatus = invoiceStatusFromBalance({
        storedStatus: invoice.status,
        total: invoice.total,
        allocations: invoice.allocations,
        credits: invoice.creditNotes,
        dueDate: invoice.dueDate,
        now: completedAt,
      });
      if (!balance.eq(0) || derivedStatus !== 'paid') {
        throw new Error('The renewal invoice must be fully paid before the project can be renewed');
      }

      if (!supportsAutomaticRenewalCycle(invoice.project.renewalCycle)) {
        throw new Error('Custom and one-time renewal cycles require Finance to set the new project dates manually');
      }

      if (invoice.renewalCompletedAt) {
        return {
          alreadyCompleted: true,
          invoice,
          project: invoice.project,
          previousExpiryDate: null as Date | null,
          previousNextRenewalDate: null as Date | null,
        };
      }

      const dates = calculateRenewedServiceDates({
        renewalForDate: invoice.renewalForDate,
        billingCycle: invoice.project.renewalCycle,
        currentExpiryDate: invoice.project.expiryDate,
        currentNextDueDate: invoice.project.nextRenewalDate,
      });

      const previousExpiryDate = invoice.project.expiryDate;
      const previousNextRenewalDate = invoice.project.nextRenewalDate;
      const project = await tx.clientProject.update({
        where: { id: invoice.project.id },
        data: {
          expiryDate: dates.expiryDate,
          nextRenewalDate: dates.nextDueDate,
        },
      });

      const completedInvoice = await tx.clientInvoice.update({
        where: { id: invoice.id },
        data: {
          renewalCompletedAt: completedAt,
          renewalCompletedBy: completedBy,
        },
      });

      await tx.financeCollectionActivity.updateMany({
        where: {
          invoiceId: invoice.id,
          completedAt: null,
          nextFollowUpAt: { not: null },
        },
        data: { completedAt },
      });

      return {
        alreadyCompleted: false,
        invoice: completedInvoice,
        project,
        previousExpiryDate,
        previousNextRenewalDate,
      };
    });

    await recordAdminAudit({
      admin: actor,
      action: result.alreadyCompleted
        ? 'admin.finance_project_renewal_completion_rechecked'
        : 'admin.finance_project_renewal_completed',
      entity: 'ClientInvoice',
      entityId: result.invoice.id,
      details: {
        invoiceNumber: result.invoice.invoiceNumber,
        projectId: result.invoice.projectId,
        renewalForDate: result.invoice.renewalForDate?.toISOString() || null,
        renewalCompletedAt: result.invoice.renewalCompletedAt?.toISOString() || null,
        previousExpiryDate: result.previousExpiryDate?.toISOString() || null,
        newExpiryDate: result.project.expiryDate?.toISOString() || null,
        previousNextRenewalDate: result.previousNextRenewalDate?.toISOString() || null,
        newNextRenewalDate: result.project.nextRenewalDate?.toISOString() || null,
        alreadyCompleted: result.alreadyCompleted,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        alreadyCompleted: result.alreadyCompleted,
        invoice: {
          id: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          renewalForDate: result.invoice.renewalForDate,
          renewalCompletedAt: result.invoice.renewalCompletedAt,
          renewalCompletedBy: result.invoice.renewalCompletedBy,
        },
        project: {
          id: result.project.id,
          expiryDate: result.project.expiryDate,
          nextRenewalDate: result.project.nextRenewalDate,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete project renewal';
    const status =
      message.includes('not found') ? 404 :
      message.includes('fully paid') ||
      message.includes('not a project renewal') ||
      message.includes('Service-linked') ||
      message.includes('Draft or void') ||
      message.includes('Custom and one-time') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
