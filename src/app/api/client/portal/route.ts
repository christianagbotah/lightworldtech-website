import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getActiveClientContext } from '@/lib/client-access';
import { invoiceBalance, invoiceStatusFromBalance, paymentUnallocated, sumAmounts } from '@/lib/finance';
import { hubtelConfiguration } from '@/lib/hubtel';

export async function GET(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    const organization = await db.clientOrganization.findUnique({
      where: { id: context.user.organizationId },
      include: {
        projects: {
          orderBy: [{ updatedAt: 'desc' }],
          include: {
            milestones: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
            documents: {
              where: { visibleToClient: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true, title: true, description: true, url: true,
                category: true, createdAt: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true, authorType: true, authorName: true,
                message: true, createdAt: true,
              },
            },
            attachments: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                uploadedByType: true,
                uploadedByName: true,
                createdAt: true,
              },
            },
          },
        },
        announcements: {
          where: { active: true, publishAt: { lte: now } },
          orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
          take: 30,
          select: {
            id: true, projectId: true, title: true, body: true,
            publishAt: true, createdAt: true,
          },
        },
        agreements: {
          where: {
            attachments: { some: { visibleToClient: true } },
          },
          orderBy: [{ status: 'asc' }, { expiryDate: 'asc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            title: true,
            agreementType: true,
            status: true,
            referenceNumber: true,
            effectiveDate: true,
            expiryDate: true,
            signedAt: true,
            project: { select: { id: true, name: true } },
            attachments: {
              where: { visibleToClient: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
        services: {
          orderBy: [{ nextDueDate: 'asc' }, { expiryDate: 'asc' }, { updatedAt: 'desc' }],
          include: {
            project: { select: { id: true, name: true } },
            changes: { orderBy: { effectiveAt: 'desc' }, take: 20 },
          },
        },
        invoices: {
          where: { status: { notIn: ['draft', 'void'] } },
          orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
          take: 200,
          include: {
            service: { select: { id: true, name: true, planName: true } },
            project: { select: { id: true, name: true } },
            lines: { orderBy: { order: 'asc' } },
            creditNotes: {
              where: { status: 'posted' },
              orderBy: { issueDate: 'desc' },
              include: { refunds: { orderBy: { refundedAt: 'asc' } } },
            },
            allocations: {
              include: {
                payment: {
                  select: {
                    id: true, paymentNumber: true, amount: true,
                    paidAt: true, method: true, reference: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          take: 200,
          include: {
            allocations: {
              include: {
                invoice: {
                  select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!organization || organization.status !== 'active') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountByCurrency: Record<string, { outstanding: Prisma.Decimal; credit: Prisma.Decimal }> = {};
    const ensureCurrency = (currency: string) => {
      if (!accountByCurrency[currency]) {
        accountByCurrency[currency] = {
          outstanding: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(0),
        };
      }
      return accountByCurrency[currency];
    };

    const invoices = organization.invoices.map((invoice) => {
      const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);
      const amountPaid = sumAmounts(invoice.allocations);
      const creditedAmount = invoice.creditNotes.reduce(
        (sum, note) => sum.plus(note.appliedAmount),
        new Prisma.Decimal(0),
      );
      const refundableCredit = invoice.creditNotes.reduce((sum, note) => {
        const refunded = note.refunds.reduce(
          (refundTotal, refund) => refundTotal.plus(refund.amount),
          new Prisma.Decimal(0),
        );
        return sum.plus(
          Prisma.Decimal.max(
            new Prisma.Decimal(0),
            note.total.minus(note.appliedAmount).minus(refunded),
          ),
        );
      }, new Prisma.Decimal(0));
      ensureCurrency(invoice.currency).outstanding =
        ensureCurrency(invoice.currency).outstanding.plus(balance);
      ensureCurrency(invoice.currency).credit =
        ensureCurrency(invoice.currency).credit.plus(refundableCredit);
      return {
        ...invoice,
        subtotal: invoice.subtotal.toFixed(2),
        discount: invoice.discount.toFixed(2),
        tax: invoice.tax.toFixed(2),
        total: invoice.total.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        creditedAmount: creditedAmount.toFixed(2),
        refundableCredit: refundableCredit.toFixed(2),
        balance: balance.toFixed(2),
        derivedStatus: invoiceStatusFromBalance({
          storedStatus: invoice.status,
          total: invoice.total,
          allocations: invoice.allocations,
          credits: invoice.creditNotes,
          dueDate: invoice.dueDate,
          now,
        }),
        lines: invoice.lines.map((line) => ({
          ...line,
          quantity: line.quantity.toFixed(2),
          unitPrice: line.unitPrice.toFixed(2),
          amount: line.amount.toFixed(2),
        })),
        creditNotes: invoice.creditNotes.map((note) => {
          const refunded = note.refunds.reduce(
            (sum, refund) => sum.plus(refund.amount),
            new Prisma.Decimal(0),
          );
          return {
            ...note,
            subtotal: note.subtotal.toFixed(2),
            tax: note.tax.toFixed(2),
            total: note.total.toFixed(2),
            appliedAmount: note.appliedAmount.toFixed(2),
            refundedAmount: refunded.toFixed(2),
            refundableBalance: Prisma.Decimal.max(
              new Prisma.Decimal(0),
              note.total.minus(note.appliedAmount).minus(refunded),
            ).toFixed(2),
            refunds: note.refunds.map((refund) => ({
              ...refund,
              amount: refund.amount.toFixed(2),
            })),
          };
        }),
        allocations: invoice.allocations.map((allocation) => ({
          ...allocation,
          amount: allocation.amount.toFixed(2),
          payment: {
            ...allocation.payment,
            amount: allocation.payment.amount.toFixed(2),
          },
        })),
      };
    });

    const payableInvoiceByService = new Map<string, {
      id: string;
      invoiceNumber: string;
      currency: string;
      balance: string;
      dueDate: Date;
      derivedStatus: string;
    }>();
    const payableInvoiceByProject = new Map<string, {
      id: string;
      invoiceNumber: string;
      currency: string;
      balance: string;
      dueDate: Date;
      derivedStatus: string;
      renewalForDate: Date | null;
    }>();

    for (const invoice of invoices) {
      if (!invoice.serviceId || Number(invoice.balance) <= 0) continue;
      const candidate = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        derivedStatus: invoice.derivedStatus,
      };
      const existing = payableInvoiceByService.get(invoice.serviceId);
      if (!existing || candidate.dueDate.getTime() < existing.dueDate.getTime()) {
        payableInvoiceByService.set(invoice.serviceId, candidate);
      }
    }

    for (const invoice of invoices) {
      if (!invoice.projectId || Number(invoice.balance) <= 0) continue;
      const candidate = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        balance: invoice.balance,
        dueDate: invoice.dueDate,
        derivedStatus: invoice.derivedStatus,
        renewalForDate: invoice.renewalForDate,
      };
      const existing = payableInvoiceByProject.get(invoice.projectId);
      if (!existing || candidate.dueDate.getTime() < existing.dueDate.getTime()) {
        payableInvoiceByProject.set(invoice.projectId, candidate);
      }
    }

    const payments = organization.payments.map((payment) => {
      const unallocated = paymentUnallocated(payment.amount, payment.allocations);
      ensureCurrency(payment.currency).credit =
        ensureCurrency(payment.currency).credit.plus(unallocated);
      return {
        ...payment,
        amount: payment.amount.toFixed(2),
        allocatedAmount: sumAmounts(payment.allocations).toFixed(2),
        unallocatedAmount: unallocated.toFixed(2),
        allocations: payment.allocations.map((allocation) => ({
          ...allocation,
          amount: allocation.amount.toFixed(2),
          invoice: {
            ...allocation.invoice,
            total: allocation.invoice.total.toFixed(2),
          },
        })),
      };
    });

    const services = organization.services.map((service) => ({
      ...service,
      recurringAmount: service.recurringAmount.toFixed(2),
      payableInvoice: payableInvoiceByService.get(service.id) || null,
      changes: service.changes.map((change) => ({
        ...change,
        previousAmount: change.previousAmount?.toFixed(2) ?? null,
        newAmount: change.newAmount?.toFixed(2) ?? null,
      })),
    }));

    const accountSummary = Object.fromEntries(
      Object.entries(accountByCurrency).map(([currency, totals]) => [
        currency,
        {
          outstanding: totals.outstanding.toFixed(2),
          unappliedCredit: totals.credit.toFixed(2),
          netDue: Prisma.Decimal.max(0, totals.outstanding.minus(totals.credit)).toFixed(2),
        },
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        user: { name: context.user.name, email: context.user.email, role: context.user.role },
        organization: {
          id: organization.id,
          name: organization.name,
          primaryContactName: organization.primaryContactName,
          primaryEmail: organization.primaryEmail,
          primaryPhone: organization.primaryPhone,
        },
        projects: organization.projects.map((project) => ({
          ...project,
          renewalAmount: project.renewalAmount.toFixed(2),
          budgetAmount: project.budgetAmount.toFixed(2),
          payableInvoice: payableInvoiceByProject.get(project.id) || null,
        })),
        tickets: organization.tickets,
        announcements: organization.announcements,
        agreements: organization.agreements,
        account: {
          summary: accountSummary,
          services,
          invoices,
          payments,
          onlinePaymentsAvailable: hubtelConfiguration().payments,
        },
      },
    });
  } catch (error) {
    console.error('Client portal fetch error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load client portal' }, { status: 500 });
  }
}