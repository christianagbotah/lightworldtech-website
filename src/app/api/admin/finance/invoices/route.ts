import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { postInvoiceJournal } from '@/lib/finance-ledger';
import {
  computeTaxComponents,
  invoiceBalance,
  invoiceStatusFromBalance,
  nextInvoiceNumber,
  normalizeCurrency,
  sumAmounts,
} from '@/lib/finance';

const lineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive().max(1000000),
  unitPrice: z.coerce.number().min(0).max(999999999999),
});

const schema = z.object({
  organizationId: z.string().min(1),
  serviceId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  agreementId: z.string().min(1).nullable().optional(),
  billingMilestoneIds: z.array(z.string().min(1)).max(20).optional().default([]),
  status: z.enum(['draft', 'issued']).default('issued'),
  currency: z.string().trim().max(3).default('GHS'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  renewalForDate: z.coerce.date().nullable().optional(),
  discount: z.coerce.number().min(0).max(999999999999).default(0),
  taxTreatment: z.enum(['legacy', 'none', 'standard', 'zero', 'exempt']).optional(),
  tax: z.coerce.number().min(0).max(999999999999).default(0),
  notes: z.string().trim().max(8000).default(''),
  lines: z.array(lineSchema).min(1).max(100),
}).refine((value) => value.dueDate.getTime() >= value.issueDate.getTime(), {
  message: 'Due date cannot be earlier than issue date',
  path: ['dueDate'],
});

function serializeInvoice(invoice: any) {
  const balance = invoiceBalance(invoice.total, invoice.allocations || [], invoice.creditNotes || []);
  const amountPaid = sumAmounts(invoice.allocations || []);
  return {
    ...invoice,
    subtotal: invoice.subtotal.toFixed(2),
    discount: invoice.discount.toFixed(2),
    tax: invoice.tax.toFixed(2),
    taxableAmount: invoice.taxableAmount.toFixed(2),
    vatRate: invoice.vatRate.toFixed(2),
    vatAmount: invoice.vatAmount.toFixed(2),
    nhilRate: invoice.nhilRate.toFixed(2),
    nhilAmount: invoice.nhilAmount.toFixed(2),
    getfundRate: invoice.getfundRate.toFixed(2),
    getfundAmount: invoice.getfundAmount.toFixed(2),
    total: invoice.total.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    balance: balance.toFixed(2),
    derivedStatus: invoiceStatusFromBalance({
      storedStatus: invoice.status,
      total: invoice.total,
      allocations: invoice.allocations || [],
      credits: invoice.creditNotes || [],
      dueDate: invoice.dueDate,
    }),
    lines: (invoice.lines || []).map((line: any) => ({
      ...line,
      quantity: line.quantity.toFixed(2),
      unitPrice: line.unitPrice.toFixed(2),
      amount: line.amount.toFixed(2),
    })),
    creditedAmount: (invoice.creditNotes || []).reduce((sum: Prisma.Decimal, note: any) => sum.plus(note.appliedAmount), new Prisma.Decimal(0)).toFixed(2),
    creditNotes: (invoice.creditNotes || []).map((note: any) => ({ ...note, subtotal: note.subtotal.toFixed(2), tax: note.tax.toFixed(2), total: note.total.toFixed(2), appliedAmount: note.appliedAmount.toFixed(2) })),
    allocations: (invoice.allocations || []).map((allocation: any) => ({
      ...allocation,
      amount: allocation.amount.toFixed(2),
      ...(allocation.payment ? {
        payment: {
          ...allocation.payment,
          amount: allocation.payment.amount.toFixed(2),
        },
      } : {}),
    })),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') || undefined;
  const status = searchParams.get('status') || undefined;
  const q = searchParams.get('q')?.trim();

  const invoices = await db.clientInvoice.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(q ? {
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { organization: { name: { contains: q, mode: 'insensitive' } } },
          { service: { name: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    take: 1000,
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      organization: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, planName: true } },
      project: { select: { id: true, name: true } },
      agreement: { select: { id: true, title: true, referenceNumber: true, agreementType: true, status: true } },
      billingMilestones: {
        select: { id: true, title: true, amount: true, dueDate: true, status: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      },
      lines: { orderBy: { order: 'asc' } },
      creditNotes: { where: { status: 'posted' }, orderBy: { issueDate: 'asc' } },
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              paymentNumber: true,
              amount: true,
              paidAt: true,
              method: true,
              reference: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: invoices.map(serializeInvoice) });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid invoice', details: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await db.clientOrganization.findUnique({
    where: { id: parsed.data.organizationId },
    select: {
      id: true,
      paymentTermsDays: true,
      creditLimitCurrency: true,
      creditLimit: true,
      creditHold: true,
      creditHoldReason: true,
    },
  });
  if (!organization) return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });

  if (parsed.data.renewalForDate && !parsed.data.serviceId) {
    return NextResponse.json({ success: false, error: 'Renewal cycle invoices must be linked to a service' }, { status: 400 });
  }

  if (parsed.data.serviceId) {
    const service = await db.clientServiceAccount.findFirst({
      where: { id: parsed.data.serviceId, organizationId: parsed.data.organizationId },
      select: { id: true, currency: true },
    });
    if (!service) return NextResponse.json({ success: false, error: 'Service does not belong to this client' }, { status: 400 });
    if (normalizeCurrency(parsed.data.currency) !== service.currency) {
      return NextResponse.json({ success: false, error: 'Invoice currency must match the linked service currency' }, { status: 400 });
    }
  }

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: parsed.data.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ success: false, error: 'Project does not belong to this client' }, { status: 400 });
  }

  if (parsed.data.agreementId) {
    const agreement = await db.clientAgreement.findFirst({
      where: { id: parsed.data.agreementId, organizationId: parsed.data.organizationId },
      select: { id: true, projectId: true, status: true, approvalStatus: true, currency: true },
    });
    if (!agreement) {
      return NextResponse.json({ success: false, error: 'Agreement does not belong to this client' }, { status: 400 });
    }
    if (agreement.status !== 'active' || agreement.approvalStatus !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Only approved active agreements can be linked to a new invoice' },
        { status: 409 },
      );
    }
    if (normalizeCurrency(parsed.data.currency) !== normalizeCurrency(agreement.currency)) {
      return NextResponse.json(
        { success: false, error: 'Invoice currency must match the linked agreement currency' },
        { status: 400 },
      );
    }
    if (parsed.data.projectId && agreement.projectId && parsed.data.projectId !== agreement.projectId) {
      return NextResponse.json(
        { success: false, error: 'Invoice project must match the linked agreement project' },
        { status: 400 },
      );
    }
  }

  let selectedBillingMilestones: Array<{
    id: string;
    agreementId: string;
    invoiceId: string | null;
    status: string;
    amount: Prisma.Decimal;
  }> = [];

  if (parsed.data.billingMilestoneIds.length > 0) {
    if (!parsed.data.agreementId) {
      return NextResponse.json(
        { success: false, error: 'Billing milestones require an originating agreement' },
        { status: 400 },
      );
    }

    selectedBillingMilestones = await db.clientAgreementBillingMilestone.findMany({
      where: { id: { in: parsed.data.billingMilestoneIds } },
      select: { id: true, agreementId: true, invoiceId: true, status: true, amount: true },
    });

    if (selectedBillingMilestones.length !== parsed.data.billingMilestoneIds.length) {
      return NextResponse.json({ success: false, error: 'One or more billing milestones could not be found' }, { status: 400 });
    }
    if (selectedBillingMilestones.some((item) => item.agreementId !== parsed.data.agreementId)) {
      return NextResponse.json({ success: false, error: 'Billing milestones must belong to the linked agreement' }, { status: 400 });
    }
    if (selectedBillingMilestones.some((item) => item.invoiceId)) {
      return NextResponse.json({ success: false, error: 'One or more billing milestones are already linked to an invoice' }, { status: 409 });
    }
    if (selectedBillingMilestones.some((item) => item.status !== 'ready')) {
      return NextResponse.json({ success: false, error: 'Only Ready billing milestones can be invoiced' }, { status: 409 });
    }
  }

  const lines = parsed.data.lines.map((line, index) => {
    const quantity = new Prisma.Decimal(line.quantity);
    const unitPrice = new Prisma.Decimal(line.unitPrice);
    return {
      description: line.description,
      quantity,
      unitPrice,
      amount: quantity.mul(unitPrice).toDecimalPlaces(2),
      order: index,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
  const discount = new Prisma.Decimal(parsed.data.discount).toDecimalPlaces(2);
  if (discount.gt(subtotal)) {
    return NextResponse.json({ success: false, error: 'Discount cannot exceed invoice subtotal' }, { status: 400 });
  }

  const taxableAmount = subtotal.minus(discount).toDecimalPlaces(2);
  if (selectedBillingMilestones.length > 0) {
    const scheduledAmount = selectedBillingMilestones.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);
    if (!taxableAmount.eq(scheduledAmount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice net line value must match the selected billing milestone amount',
          scheduledAmount: scheduledAmount.toFixed(2),
          invoiceNetValue: taxableAmount.toFixed(2),
        },
        { status: 409 },
      );
    }
  }
  const taxTreatment = parsed.data.taxTreatment || (Number(parsed.data.tax || 0) > 0 ? 'legacy' : 'none');

  let taxProfile: Awaited<ReturnType<typeof db.financeTaxProfile.findUnique>> = null;
  if (taxTreatment === 'standard') {
    taxProfile = await db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } });
    if (!taxProfile || !taxProfile.enabled) {
      return NextResponse.json(
        { success: false, error: 'Standard Ghana VAT is disabled. Enable the statutory tax profile first.' },
        { status: 409 },
      );
    }
    if (parsed.data.issueDate.getTime() < taxProfile.effectiveFrom.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'The configured Ghana VAT profile is not effective on this invoice date',
          effectiveFrom: taxProfile.effectiveFrom,
        },
        { status: 409 },
      );
    }
  }

  const taxResult = computeTaxComponents({
    taxableAmount,
    treatment: taxTreatment,
    vatRate: taxProfile?.vatRate,
    nhilRate: taxProfile?.nhilRate,
    getfundRate: taxProfile?.getfundRate,
    legacyTax: parsed.data.tax,
  });
  const {
    vatRate,
    vatAmount,
    nhilRate,
    nhilAmount,
    getfundRate,
    getfundAmount,
    tax,
    total,
  } = taxResult;
  const invoiceNumber = await nextInvoiceNumber(parsed.data.issueDate);

  const currency = normalizeCurrency(parsed.data.currency);
  const transactionResult = await db.$transaction(async (tx) => {
    if (parsed.data.status === 'issued') {
      if (organization.creditHold) {
        return {
          invoice: null,
          duplicate: null,
          creditBlocked: {
            type: 'credit_hold' as const,
            message: organization.creditHoldReason || 'Customer account is on credit hold',
            limit: organization.creditLimit.toFixed(2),
            outstanding: null,
            projected: null,
            currency: organization.creditLimitCurrency,
          },
        };
      }

      const creditCurrency = normalizeCurrency(organization.creditLimitCurrency);
      if (organization.creditLimit.gt(0) && currency === creditCurrency) {
        await tx.$queryRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          'lightworld-credit-control:' + organization.id + ':' + currency,
        );

        const openInvoices = await tx.clientInvoice.findMany({
          where: {
            organizationId: organization.id,
            currency,
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
        const projected = outstanding.plus(total);
        if (projected.gt(organization.creditLimit)) {
          return {
            invoice: null,
            duplicate: null,
            creditBlocked: {
              type: 'credit_limit' as const,
              message: 'Issuing this invoice would exceed the customer credit limit',
              limit: organization.creditLimit.toFixed(2),
              outstanding: outstanding.toFixed(2),
              projected: projected.toFixed(2),
              currency,
            },
          };
        }
      }
    }

    if (parsed.data.serviceId && parsed.data.renewalForDate) {
      const cycleKey =
        'lightworld-renewal-invoice:' +
        parsed.data.serviceId +
        ':' +
        parsed.data.renewalForDate.toISOString().slice(0, 10);
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        cycleKey,
      );

      const duplicate = await tx.clientInvoice.findFirst({
        where: {
          serviceId: parsed.data.serviceId,
          renewalForDate: parsed.data.renewalForDate,
          status: { not: 'void' },
        },
        select: { id: true, invoiceNumber: true, status: true },
      });
      if (duplicate) {
        return { invoice: null, duplicate, creditBlocked: null };
      }
    }

    const created = await tx.clientInvoice.create({
      data: {
        invoiceNumber,
        organizationId: parsed.data.organizationId,
        serviceId: parsed.data.serviceId || null,
        projectId: parsed.data.projectId || null,
        agreementId: parsed.data.agreementId || null,
        status: parsed.data.status,
        currency,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
        renewalForDate: parsed.data.renewalForDate || null,
        subtotal,
        discount,
        taxTreatment,
        taxableAmount,
        vatRate,
        vatAmount,
        nhilRate,
        nhilAmount,
        getfundRate,
        getfundAmount,
        tax,
        total,
        notes: parsed.data.notes,
        createdBy: actor.name || actor.email,
        lines: { create: lines },
      },
      include: {
        organization: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, planName: true } },
        project: { select: { id: true, name: true } },
        agreement: { select: { id: true, title: true, referenceNumber: true, agreementType: true, status: true } },
        lines: { orderBy: { order: 'asc' } },
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
      },
    });

    if (parsed.data.billingMilestoneIds.length > 0) {
      const linked = await tx.clientAgreementBillingMilestone.updateMany({
        where: {
          id: { in: parsed.data.billingMilestoneIds },
          agreementId: parsed.data.agreementId!,
          invoiceId: null,
          status: 'ready',
        },
        data: { invoiceId: created.id },
      });
      if (linked.count !== parsed.data.billingMilestoneIds.length) {
        throw new Error('Billing milestone changed while the invoice was being created. Retry after refreshing Finance.');
      }
    }

    if (created.status === 'issued') {
      await postInvoiceJournal(tx, {
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
        issueDate: created.issueDate,
        currency: created.currency,
        subtotal: created.subtotal,
        discount: created.discount,
        tax: created.tax,
        vatAmount: created.vatAmount,
        nhilAmount: created.nhilAmount,
        getfundAmount: created.getfundAmount,
        total: created.total,
        postedBy: actor.name || actor.email,
      });
    }

    return { invoice: created, duplicate: null, creditBlocked: null };
  });

  if (transactionResult.creditBlocked) {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_invoice_credit_blocked',
      entity: 'ClientOrganization',
      entityId: organization.id,
      details: {
        organizationId: organization.id,
        blockType: transactionResult.creditBlocked.type,
        currency: transactionResult.creditBlocked.currency,
        limit: transactionResult.creditBlocked.limit,
        outstanding: transactionResult.creditBlocked.outstanding,
        projected: transactionResult.creditBlocked.projected,
        invoiceTotal: total.toFixed(2),
      },
    });
    return NextResponse.json({
      success: false,
      error: transactionResult.creditBlocked.message,
      creditControl: transactionResult.creditBlocked,
    }, { status: 409 });
  }

  if (transactionResult.duplicate) {
    return NextResponse.json({
      success: false,
      error: 'A renewal invoice already exists for this service and renewal date',
      existingInvoice: transactionResult.duplicate,
    }, { status: 409 });
  }

  const invoice = transactionResult.invoice!;

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_invoice_created',
    entity: 'ClientInvoice',
    entityId: invoice.id,
    details: {
      invoiceNumber,
      organizationId: invoice.organizationId,
      agreementId: invoice.agreementId,
      billingMilestoneIds: parsed.data.billingMilestoneIds,
      total: total.toFixed(2),
      currency: invoice.currency,
      taxTreatment: invoice.taxTreatment,
      taxableAmount: invoice.taxableAmount.toFixed(2),
      vatAmount: invoice.vatAmount.toFixed(2),
      nhilAmount: invoice.nhilAmount.toFixed(2),
      getfundAmount: invoice.getfundAmount.toFixed(2),
      renewalForDate: invoice.renewalForDate?.toISOString() || null,
    },
  });

  return NextResponse.json({ success: true, data: serializeInvoice(invoice) }, { status: 201 });
}
