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
  status: z.enum(['draft', 'issued']).default('issued'),
  currency: z.string().trim().max(3).default('GHS'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
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
    select: { id: true },
  });
  if (!organization) return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });

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
  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.clientInvoice.create({
      data: {
        invoiceNumber,
        organizationId: parsed.data.organizationId,
        serviceId: parsed.data.serviceId || null,
        projectId: parsed.data.projectId || null,
        status: parsed.data.status,
        currency,
        issueDate: parsed.data.issueDate,
        dueDate: parsed.data.dueDate,
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
        lines: { orderBy: { order: 'asc' } },
        allocations: true,
        creditNotes: { where: { status: 'posted' } },
      },
    });

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

    return created;
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_invoice_created',
    entity: 'ClientInvoice',
    entityId: invoice.id,
    details: {
      invoiceNumber,
      organizationId: invoice.organizationId,
      total: total.toFixed(2),
      currency: invoice.currency,
      taxTreatment: invoice.taxTreatment,
      taxableAmount: invoice.taxableAmount.toFixed(2),
      vatAmount: invoice.vatAmount.toFixed(2),
      nhilAmount: invoice.nhilAmount.toFixed(2),
      getfundAmount: invoice.getfundAmount.toFixed(2),
    },
  });

  return NextResponse.json({ success: true, data: serializeInvoice(invoice) }, { status: 201 });
}
