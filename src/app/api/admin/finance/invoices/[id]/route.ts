import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postInvoiceJournal, postInvoiceVoidJournal } from '@/lib/finance-ledger';
import { invoiceBalance, normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  status: z.enum(['draft', 'issued', 'void']).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(8000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one invoice change is required');

type IssueBlock = {
  error: string;
  status: number;
  creditControl?: {
    type: 'credit_hold' | 'credit_limit';
    currency: string;
    limit: string;
    outstanding: string | null;
    projected: string | null;
  };
};

function comparableInvoiceValue(
  invoice: { taxableAmount: Prisma.Decimal; total: Prisma.Decimal },
  basis: string,
): Prisma.Decimal {
  return basis === 'tax_exclusive' ? invoice.taxableAmount : invoice.total;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid invoice update', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const existing = await db.clientInvoice.findUnique({
    where: { id },
    select: { id: true, invoiceNumber: true, status: true },
  });
  if (!existing) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'lightworld-invoice-lifecycle:' + id,
    );

    const invoice = await tx.clientInvoice.findUnique({
      where: { id },
      include: {
        allocations: true,
        creditNotes: {
          where: { status: 'posted' },
          select: { id: true, creditNoteNumber: true },
        },
        organization: {
          select: {
            id: true,
            creditLimitCurrency: true,
            creditLimit: true,
            creditHold: true,
            creditHoldReason: true,
          },
        },
        service: { select: { id: true, currency: true } },
        agreement: {
          select: {
            id: true,
            organizationId: true,
            projectId: true,
            status: true,
            approvalStatus: true,
            currency: true,
            contractValue: true,
            contractValueBasis: true,
          },
        },
        billingMilestone: {
          select: {
            id: true,
            agreementId: true,
            amount: true,
            readinessStatus: true,
          },
        },
      },
    });
    if (!invoice) {
      return { updated: null, blocked: { error: 'Invoice not found', status: 404 } satisfies IssueBlock };
    }

    if (parsed.data.status === 'void' && invoice.allocations.length > 0) {
      return {
        updated: null,
        blocked: { error: 'An invoice with allocated payments cannot be voided', status: 409 } satisfies IssueBlock,
      };
    }
    if (parsed.data.status === 'void' && invoice.creditNotes.length > 0) {
      return {
        updated: null,
        blocked: { error: 'An invoice with posted credit notes cannot be voided. Reverse the credit-note workflow first.', status: 409 } satisfies IssueBlock,
      };
    }
    if (invoice.status === 'void' && parsed.data.status && parsed.data.status !== 'void') {
      return {
        updated: null,
        blocked: { error: 'A void invoice is terminal and cannot be reactivated', status: 409 } satisfies IssueBlock,
      };
    }
    if (invoice.status !== 'draft' && parsed.data.status === 'draft') {
      return {
        updated: null,
        blocked: { error: 'An issued invoice cannot be returned to draft. Void it instead.', status: 409 } satisfies IssueBlock,
      };
    }
    if (parsed.data.dueDate && parsed.data.dueDate.getTime() < invoice.issueDate.getTime()) {
      return {
        updated: null,
        blocked: { error: 'Due date cannot be earlier than issue date', status: 400 } satisfies IssueBlock,
      };
    }

    const issuing = invoice.status === 'draft' && parsed.data.status === 'issued';
    if (issuing) {
      if (invoice.organization.creditHold) {
        return {
          updated: null,
          blocked: {
            error: invoice.organization.creditHoldReason || 'Customer account is on credit hold',
            status: 409,
            creditControl: {
              type: 'credit_hold',
              currency: invoice.organization.creditLimitCurrency,
              limit: invoice.organization.creditLimit.toFixed(2),
              outstanding: null,
              projected: null,
            },
          } satisfies IssueBlock,
        };
      }

      if (invoice.service && normalizeCurrency(invoice.currency) !== normalizeCurrency(invoice.service.currency)) {
        return {
          updated: null,
          blocked: { error: 'Invoice currency no longer matches the linked service currency', status: 409 } satisfies IssueBlock,
        };
      }

      if (invoice.agreement) {
        if (invoice.agreement.status !== 'active' || invoice.agreement.approvalStatus !== 'approved') {
          return {
            updated: null,
            blocked: { error: 'The linked agreement is no longer approved and active', status: 409 } satisfies IssueBlock,
          };
        }
        if (invoice.agreement.organizationId !== invoice.organizationId) {
          return {
            updated: null,
            blocked: { error: 'The linked agreement no longer belongs to this customer', status: 409 } satisfies IssueBlock,
          };
        }
        if (normalizeCurrency(invoice.currency) !== normalizeCurrency(invoice.agreement.currency)) {
          return {
            updated: null,
            blocked: { error: 'Invoice currency no longer matches the linked agreement currency', status: 409 } satisfies IssueBlock,
          };
        }
        if (invoice.projectId && invoice.agreement.projectId && invoice.projectId !== invoice.agreement.projectId) {
          return {
            updated: null,
            blocked: { error: 'Invoice project no longer matches the linked agreement project', status: 409 } satisfies IssueBlock,
          };
        }

        const otherIssued = await tx.clientInvoice.findMany({
          where: {
            agreementId: invoice.agreement.id,
            id: { not: invoice.id },
            status: { notIn: ['draft', 'void'] },
          },
          select: { taxableAmount: true, total: true },
        });
        const alreadyIssued = otherIssued.reduce(
          (sum, item) => sum.plus(comparableInvoiceValue(item, invoice.agreement!.contractValueBasis)),
          new Prisma.Decimal(0),
        );
        const currentComparable = comparableInvoiceValue(invoice, invoice.agreement.contractValueBasis);
        const projectedAgreementBilling = alreadyIssued.plus(currentComparable);
        if (projectedAgreementBilling.gt(invoice.agreement.contractValue)) {
          return {
            updated: null,
            blocked: {
              error: 'Issuing this draft would exceed the linked agreement contract value',
              status: 409,
            } satisfies IssueBlock,
          };
        }

        if (invoice.billingMilestone) {
          if (invoice.billingMilestone.agreementId !== invoice.agreement.id) {
            return {
              updated: null,
              blocked: { error: 'Billing milestone no longer belongs to the linked agreement', status: 409 } satisfies IssueBlock,
            };
          }
          if (invoice.billingMilestone.readinessStatus !== 'ready_to_bill') {
            return {
              updated: null,
              blocked: { error: 'Billing milestone is no longer ready to bill', status: 409 } satisfies IssueBlock,
            };
          }

          const duplicate = await tx.clientInvoice.findFirst({
            where: {
              billingMilestoneId: invoice.billingMilestone.id,
              id: { not: invoice.id },
              status: { not: 'void' },
            },
            select: { id: true, invoiceNumber: true, status: true },
          });
          if (duplicate) {
            return {
              updated: null,
              blocked: {
                error: 'Another non-void invoice is already linked to this billing milestone: ' + duplicate.invoiceNumber,
                status: 409,
              } satisfies IssueBlock,
            };
          }

          if (!currentComparable.eq(invoice.billingMilestone.amount)) {
            return {
              updated: null,
              blocked: {
                error: 'Draft value no longer matches the approved billing milestone amount. Void this draft and prepare a replacement.',
                status: 409,
              } satisfies IssueBlock,
            };
          }
        }
      } else if (invoice.billingMilestoneId) {
        return {
          updated: null,
          blocked: { error: 'Billing milestone invoice is missing its originating agreement', status: 409 } satisfies IssueBlock,
        };
      }

      if (invoice.taxTreatment === 'standard') {
        const taxProfile = await tx.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
        if (!taxProfile || !taxProfile.enabled) {
          return {
            updated: null,
            blocked: { error: 'Standard Ghana VAT is disabled. Review the draft before issuing.', status: 409 } satisfies IssueBlock,
          };
        }
        if (invoice.issueDate.getTime() < taxProfile.effectiveFrom.getTime()) {
          return {
            updated: null,
            blocked: { error: 'The configured Ghana VAT profile is not effective on this draft invoice date', status: 409 } satisfies IssueBlock,
          };
        }
        const ratesChanged =
          !invoice.vatRate.eq(taxProfile.vatRate) ||
          !invoice.nhilRate.eq(taxProfile.nhilRate) ||
          !invoice.getfundRate.eq(taxProfile.getfundRate);
        if (ratesChanged) {
          return {
            updated: null,
            blocked: {
              error: 'The statutory tax profile has changed since this draft was prepared. Void the draft and prepare a replacement with current rates.',
              status: 409,
            } satisfies IssueBlock,
          };
        }
      }

      const creditCurrency = normalizeCurrency(invoice.organization.creditLimitCurrency);
      const invoiceCurrency = normalizeCurrency(invoice.currency);
      if (invoice.organization.creditLimit.gt(0) && invoiceCurrency === creditCurrency) {
        await tx.$queryRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          'lightworld-credit-control:' + invoice.organization.id + ':' + invoiceCurrency,
        );

        const openInvoices = await tx.clientInvoice.findMany({
          where: {
            organizationId: invoice.organization.id,
            id: { not: invoice.id },
            currency: invoiceCurrency,
            status: { notIn: ['draft', 'void'] },
          },
          select: {
            total: true,
            allocations: { select: { amount: true } },
            creditNotes: { where: { status: 'posted' }, select: { appliedAmount: true } },
          },
        });
        const outstanding = openInvoices.reduce(
          (sum, row) => sum.plus(invoiceBalance(row.total, row.allocations, row.creditNotes)),
          new Prisma.Decimal(0),
        );
        const projected = outstanding.plus(invoice.total);
        if (projected.gt(invoice.organization.creditLimit)) {
          return {
            updated: null,
            blocked: {
              error: 'Issuing this draft would exceed the customer credit limit',
              status: 409,
              creditControl: {
                type: 'credit_limit',
                currency: invoiceCurrency,
                limit: invoice.organization.creditLimit.toFixed(2),
                outstanding: outstanding.toFixed(2),
                projected: projected.toFixed(2),
              },
            } satisfies IssueBlock,
          };
        }
      }
    }

    const next = await tx.clientInvoice.update({ where: { id }, data: parsed.data });
    let cleanup = { revokedAccessLinks: 0, cancelledPaymentIntents: 0 };

    if (issuing && next.status === 'issued') {
      await postInvoiceJournal(tx, {
        invoiceId: next.id,
        invoiceNumber: next.invoiceNumber,
        issueDate: next.issueDate,
        currency: next.currency,
        subtotal: next.subtotal,
        discount: next.discount,
        tax: next.tax,
        vatAmount: next.vatAmount,
        nhilAmount: next.nhilAmount,
        getfundAmount: next.getfundAmount,
        total: next.total,
        postedBy: actor.name || actor.email,
      });
    }

    if (invoice.status !== 'void' && next.status === 'void') {
      const voidedAt = new Date();
      const originalJournal = await tx.financeJournalEntry.findFirst({
        where: {
          sourceType: 'client_invoice',
          sourceId: next.id,
        },
        select: { id: true },
      });

      if (originalJournal) {
        await postInvoiceVoidJournal(tx, {
          invoiceId: next.id,
          invoiceNumber: next.invoiceNumber,
          voidDate: voidedAt,
          currency: next.currency,
          subtotal: next.subtotal,
          discount: next.discount,
          tax: next.tax,
          total: next.total,
          postedBy: actor.name || actor.email,
        });
      }

      const revokedLinks = await tx.invoiceAccessLink.updateMany({
        where: {
          invoiceId: next.id,
          status: 'active',
          revokedAt: null,
        },
        data: {
          status: 'revoked',
          revokedAt: voidedAt,
        },
      });

      const cancelledIntents = await tx.hubtelPaymentIntent.updateMany({
        where: {
          invoiceId: next.id,
          recordedPaymentId: null,
        },
        data: {
          status: 'cancelled_invoice_void',
          expiresAt: voidedAt,
        },
      });

      cleanup = {
        revokedAccessLinks: revokedLinks.count,
        cancelledPaymentIntents: cancelledIntents.count,
      };
    }

    return { updated: next, blocked: null, cleanup };
  });

  if (result.blocked) {
    await recordAdminAudit({
      admin: actor,
      action: result.blocked.creditControl
        ? 'admin.finance_invoice_issue_credit_blocked'
        : 'admin.finance_invoice_issue_blocked',
      entity: 'ClientInvoice',
      entityId: id,
      details: {
        invoiceNumber: existing.invoiceNumber,
        reason: result.blocked.error,
        statusCode: result.blocked.status,
        ...(result.blocked.creditControl || {}),
      },
    });
    return NextResponse.json(
      {
        success: false,
        error: result.blocked.error,
        ...(result.blocked.creditControl ? { creditControl: result.blocked.creditControl } : {}),
      },
      { status: result.blocked.status },
    );
  }

  const updated = result.updated!;
  await recordAdminAudit({
    admin: actor,
    action: updated.status === 'void' && existing.status !== 'void'
      ? 'admin.finance_invoice_voided'
      : existing.status === 'draft' && updated.status === 'issued'
        ? 'admin.finance_invoice_issued_from_draft'
        : 'admin.finance_invoice_updated',
    entity: 'ClientInvoice',
    entityId: id,
    details: {
      invoiceNumber: existing.invoiceNumber,
      fromStatus: existing.status,
      toStatus: updated.status,
      changedFields: Object.keys(parsed.data),
      revokedAccessLinks: 'cleanup' in result ? result.cleanup.revokedAccessLinks : 0,
      cancelledPaymentIntents: 'cleanup' in result ? result.cleanup.cancelledPaymentIntents : 0,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      subtotal: updated.subtotal.toFixed(2),
      discount: updated.discount.toFixed(2),
      tax: updated.tax.toFixed(2),
      total: updated.total.toFixed(2),
    },
  });
}
