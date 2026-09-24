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
        'lightworld-renewal-completion:' + id,
      );

      const invoice = await tx.clientInvoice.findUnique({
        where: { id },
        include: {
          allocations: true,
          creditNotes: { where: { status: 'posted' } },
          service: true,
        },
      });
      if (!invoice) throw new Error('Renewal invoice not found');
      if (!invoice.serviceId || !invoice.service || !invoice.renewalForDate) {
        throw new Error('This invoice is not a service renewal invoice');
      }
      if (['draft', 'void'].includes(invoice.status)) {
        throw new Error('Draft or void invoices cannot complete a service renewal');
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
        throw new Error('The renewal invoice must be fully paid before the service can be renewed');
      }

      if (!supportsAutomaticRenewalCycle(invoice.service.billingCycle)) {
        throw new Error('Custom and one-time billing cycles require Finance to set the new service dates manually');
      }

      if (invoice.renewalCompletedAt) {
        return {
          alreadyCompleted: true,
          invoice,
          service: invoice.service,
          change: await tx.clientServiceChange.findUnique({
            where: { sourceInvoiceId: invoice.id },
          }),
        };
      }

      const existingChange = await tx.clientServiceChange.findUnique({
        where: { sourceInvoiceId: invoice.id },
      });
      if (existingChange) {
        const reconciledInvoice = await tx.clientInvoice.update({
          where: { id: invoice.id },
          data: {
            renewalCompletedAt: existingChange.effectiveAt,
            renewalCompletedBy: existingChange.changedBy,
          },
        });
        return {
          alreadyCompleted: true,
          invoice: reconciledInvoice,
          service: invoice.service,
          change: existingChange,
        };
      }

      const dates = calculateRenewedServiceDates({
        renewalForDate: invoice.renewalForDate,
        billingCycle: invoice.service.billingCycle,
        currentExpiryDate: invoice.service.expiryDate,
        currentNextDueDate: invoice.service.nextDueDate,
      });
      const nextStatus = invoice.service.status === 'expired' ? 'active' : invoice.service.status;

      const service = await tx.clientServiceAccount.update({
        where: { id: invoice.service.id },
        data: {
          expiryDate: dates.expiryDate,
          nextDueDate: dates.nextDueDate,
          status: nextStatus,
        },
      });

      const change = await tx.clientServiceChange.create({
        data: {
          serviceId: service.id,
          changeType: 'renewal',
          sourceInvoiceId: invoice.id,
          previousPlan: invoice.service.planName,
          newPlan: service.planName,
          previousAmount: invoice.service.recurringAmount,
          newAmount: service.recurringAmount,
          previousExpiryDate: invoice.service.expiryDate,
          newExpiryDate: service.expiryDate,
          previousNextDueDate: invoice.service.nextDueDate,
          newNextDueDate: service.nextDueDate,
          previousStatus: invoice.service.status,
          newStatus: service.status,
          effectiveAt: completedAt,
          notes:
            'Paid renewal completed from ' +
            invoice.invoiceNumber +
            ' for cycle ' +
            invoice.renewalForDate.toISOString().slice(0, 10) +
            '.',
          changedBy: completedBy,
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
        service,
        change,
      };
    });

    await recordAdminAudit({
      admin: actor,
      action: result.alreadyCompleted
        ? 'admin.finance_service_renewal_completion_rechecked'
        : 'admin.finance_service_renewal_completed',
      entity: 'ClientInvoice',
      entityId: result.invoice.id,
      details: {
        invoiceNumber: result.invoice.invoiceNumber,
        serviceId: result.invoice.serviceId,
        renewalForDate: result.invoice.renewalForDate?.toISOString() || null,
        renewalCompletedAt: result.invoice.renewalCompletedAt?.toISOString() || null,
        previousExpiryDate: result.change?.previousExpiryDate?.toISOString() || null,
        newExpiryDate: result.change?.newExpiryDate?.toISOString() || null,
        previousNextDueDate: result.change?.previousNextDueDate?.toISOString() || null,
        newNextDueDate: result.change?.newNextDueDate?.toISOString() || null,
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
        service: {
          id: result.service.id,
          status: result.service.status,
          expiryDate: result.service.expiryDate,
          nextDueDate: result.service.nextDueDate,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete service renewal';
    const status =
      message.includes('not found') ? 404 :
      message.includes('fully paid') ||
      message.includes('not a service renewal') ||
      message.includes('Draft or void') ||
      message.includes('Custom and one-time') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
