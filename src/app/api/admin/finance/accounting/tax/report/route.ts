import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';

type Bucket = {
  standardSales: Prisma.Decimal;
  zeroRatedSales: Prisma.Decimal;
  exemptSales: Prisma.Decimal;
  nonTaxSales: Prisma.Decimal;
  outputVat: Prisma.Decimal;
  outputNhil: Prisma.Decimal;
  outputGetfund: Prisma.Decimal;
  creditVat: Prisma.Decimal;
  creditNhil: Prisma.Decimal;
  creditGetfund: Prisma.Decimal;
  recoverablePurchases: Prisma.Decimal;
  nonRecoverablePurchases: Prisma.Decimal;
  inputVat: Prisma.Decimal;
  inputNhil: Prisma.Decimal;
  inputGetfund: Prisma.Decimal;
  invoiceCount: number;
  creditNoteCount: number;
  supplierBillCount: number;
  legacyOutputTax: Prisma.Decimal;
  legacyCreditTax: Prisma.Decimal;
};

function freshBucket(): Bucket {
  return {
    standardSales: new Prisma.Decimal(0),
    zeroRatedSales: new Prisma.Decimal(0),
    exemptSales: new Prisma.Decimal(0),
    nonTaxSales: new Prisma.Decimal(0),
    outputVat: new Prisma.Decimal(0),
    outputNhil: new Prisma.Decimal(0),
    outputGetfund: new Prisma.Decimal(0),
    creditVat: new Prisma.Decimal(0),
    creditNhil: new Prisma.Decimal(0),
    creditGetfund: new Prisma.Decimal(0),
    recoverablePurchases: new Prisma.Decimal(0),
    nonRecoverablePurchases: new Prisma.Decimal(0),
    inputVat: new Prisma.Decimal(0),
    inputNhil: new Prisma.Decimal(0),
    inputGetfund: new Prisma.Decimal(0),
    invoiceCount: 0,
    creditNoteCount: 0,
    supplierBillCount: 0,
    legacyOutputTax: new Prisma.Decimal(0),
    legacyCreditTax: new Prisma.Decimal(0),
  };
}

function value(v: Prisma.Decimal): string {
  return v.toDecimalPlaces(2).toFixed(2);
}

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fromRaw = searchParams.get('from')?.trim() || monthStart.toISOString().slice(0, 10);
  const toRaw = searchParams.get('to')?.trim() || now.toISOString().slice(0, 10);
  const currency = searchParams.get('currency')?.trim().toUpperCase() || '';

  const from = new Date(fromRaw.length === 10 ? fromRaw + 'T00:00:00.000Z' : fromRaw);
  const to = new Date(toRaw.length === 10 ? toRaw + 'T23:59:59.999Z' : toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ success: false, error: 'Invalid tax-control date range' }, { status: 400 });
  }

  const [profile, invoices, creditNotes, bills] = await Promise.all([
    db.financeTaxProfile.findUnique({ where: { id: 'ghana-default' } }),
    db.clientInvoice.findMany({
      where: {
        status: { notIn: ['draft', 'void'] },
        issueDate: { gte: from, lte: to },
        ...(currency ? { currency } : {}),
      },
      orderBy: [{ issueDate: 'asc' }, { invoiceNumber: 'asc' }],
      select: {
        id: true,
        invoiceNumber: true,
        organization: { select: { name: true } },
        currency: true,
        issueDate: true,
        taxTreatment: true,
        taxableAmount: true,
        vatAmount: true,
        nhilAmount: true,
        getfundAmount: true,
        tax: true,
        total: true,
      },
    }),
    db.financeCreditNote.findMany({
      where: {
        status: 'posted',
        issueDate: { gte: from, lte: to },
        ...(currency ? { currency } : {}),
      },
      orderBy: [{ issueDate: 'asc' }, { creditNoteNumber: 'asc' }],
      select: {
        id: true,
        creditNoteNumber: true,
        currency: true,
        issueDate: true,
        subtotal: true,
        tax: true,
        vatAmount: true,
        nhilAmount: true,
        getfundAmount: true,
        invoice: {
          select: {
            invoiceNumber: true,
            taxTreatment: true,
          },
        },
      },
    }),
    db.financeVendorBill.findMany({
      where: {
        status: { not: 'void' },
        issueDate: { gte: from, lte: to },
        ...(currency ? { currency } : {}),
      },
      orderBy: [{ issueDate: 'asc' }, { payableNumber: 'asc' }],
      select: {
        id: true,
        payableNumber: true,
        vendor: { select: { name: true } },
        currency: true,
        issueDate: true,
        taxTreatment: true,
        taxRecoverable: true,
        taxableAmount: true,
        vatAmount: true,
        nhilAmount: true,
        getfundAmount: true,
        total: true,
      },
    }),
  ]);

  const buckets = new Map<string, Bucket>();
  const bucket = (code: string) => {
    if (!buckets.has(code)) buckets.set(code, freshBucket());
    return buckets.get(code)!;
  };

  for (const invoice of invoices) {
    const row = bucket(invoice.currency);
    row.invoiceCount += 1;
    if (invoice.taxTreatment === 'standard') row.standardSales = row.standardSales.plus(invoice.taxableAmount);
    else if (invoice.taxTreatment === 'zero') row.zeroRatedSales = row.zeroRatedSales.plus(invoice.taxableAmount);
    else if (invoice.taxTreatment === 'exempt') row.exemptSales = row.exemptSales.plus(invoice.taxableAmount);
    else row.nonTaxSales = row.nonTaxSales.plus(invoice.taxableAmount);

    row.outputVat = row.outputVat.plus(invoice.vatAmount);
    row.outputNhil = row.outputNhil.plus(invoice.nhilAmount);
    row.outputGetfund = row.outputGetfund.plus(invoice.getfundAmount);

    if (invoice.taxTreatment === 'legacy') {
      row.legacyOutputTax = row.legacyOutputTax.plus(invoice.tax);
    }
  }

  for (const note of creditNotes) {
    const row = bucket(note.currency);
    row.creditNoteCount += 1;
    row.creditVat = row.creditVat.plus(note.vatAmount);
    row.creditNhil = row.creditNhil.plus(note.nhilAmount);
    row.creditGetfund = row.creditGetfund.plus(note.getfundAmount);
    if (note.invoice.taxTreatment === 'legacy') {
      row.legacyCreditTax = row.legacyCreditTax.plus(note.tax);
    }
  }

  for (const bill of bills) {
    const row = bucket(bill.currency);
    row.supplierBillCount += 1;
    if (bill.taxTreatment === 'standard' && bill.taxRecoverable) {
      row.recoverablePurchases = row.recoverablePurchases.plus(bill.taxableAmount);
      row.inputVat = row.inputVat.plus(bill.vatAmount);
      row.inputNhil = row.inputNhil.plus(bill.nhilAmount);
      row.inputGetfund = row.inputGetfund.plus(bill.getfundAmount);
    } else if (bill.taxTreatment === 'standard') {
      row.nonRecoverablePurchases = row.nonRecoverablePurchases.plus(bill.taxableAmount);
    }
  }

  const byCurrency = Object.fromEntries(
    [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, row]) => {
      const netVat = row.outputVat.minus(row.creditVat).minus(row.inputVat);
      const netNhil = row.outputNhil.minus(row.creditNhil).minus(row.inputNhil);
      const netGetfund = row.outputGetfund.minus(row.creditGetfund).minus(row.inputGetfund);
      const netTotal = netVat.plus(netNhil).plus(netGetfund);
      return [code, {
        standardSales: value(row.standardSales),
        zeroRatedSales: value(row.zeroRatedSales),
        exemptSales: value(row.exemptSales),
        nonTaxSales: value(row.nonTaxSales),
        output: {
          vat: value(row.outputVat),
          nhil: value(row.outputNhil),
          getfund: value(row.outputGetfund),
          total: value(row.outputVat.plus(row.outputNhil).plus(row.outputGetfund)),
        },
        creditNotes: {
          vat: value(row.creditVat),
          nhil: value(row.creditNhil),
          getfund: value(row.creditGetfund),
          total: value(row.creditVat.plus(row.creditNhil).plus(row.creditGetfund)),
        },
        input: {
          recoverablePurchases: value(row.recoverablePurchases),
          nonRecoverablePurchases: value(row.nonRecoverablePurchases),
          vat: value(row.inputVat),
          nhil: value(row.inputNhil),
          getfund: value(row.inputGetfund),
          total: value(row.inputVat.plus(row.inputNhil).plus(row.inputGetfund)),
        },
        net: {
          vat: value(netVat),
          nhil: value(netNhil),
          getfund: value(netGetfund),
          total: value(netTotal),
          position: netTotal.gt(0) ? 'payable' : netTotal.lt(0) ? 'credit' : 'nil',
        },
        legacy: {
          outputTax: value(row.legacyOutputTax),
          creditTax: value(row.legacyCreditTax),
          netTax: value(row.legacyOutputTax.minus(row.legacyCreditTax)),
        },
        counts: {
          invoices: row.invoiceCount,
          creditNotes: row.creditNoteCount,
          supplierBills: row.supplierBillCount,
        },
      }];
    }),
  );

  return NextResponse.json({
    success: true,
    data: {
      from,
      to,
      currency: currency || null,
      profile: profile ? {
        enabled: profile.enabled,
        countryCode: profile.countryCode,
        vatRegistrationNumber: profile.vatRegistrationNumber,
        vatRate: profile.vatRate.toFixed(2),
        nhilRate: profile.nhilRate.toFixed(2),
        getfundRate: profile.getfundRate.toFixed(2),
        effectiveRate: profile.vatRate.plus(profile.nhilRate).plus(profile.getfundRate).toFixed(2),
        effectiveFrom: profile.effectiveFrom,
      } : null,
      byCurrency,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        taxableAmount: invoice.taxableAmount.toFixed(2),
        vatAmount: invoice.vatAmount.toFixed(2),
        nhilAmount: invoice.nhilAmount.toFixed(2),
        getfundAmount: invoice.getfundAmount.toFixed(2),
        tax: invoice.tax.toFixed(2),
        total: invoice.total.toFixed(2),
      })),
      creditNotes: creditNotes.map((note) => ({
        ...note,
        subtotal: note.subtotal.toFixed(2),
        tax: note.tax.toFixed(2),
        vatAmount: note.vatAmount.toFixed(2),
        nhilAmount: note.nhilAmount.toFixed(2),
        getfundAmount: note.getfundAmount.toFixed(2),
      })),
      supplierBills: bills.map((bill) => ({
        ...bill,
        taxableAmount: bill.taxableAmount.toFixed(2),
        vatAmount: bill.vatAmount.toFixed(2),
        nhilAmount: bill.nhilAmount.toFixed(2),
        getfundAmount: bill.getfundAmount.toFixed(2),
        total: bill.total.toFixed(2),
      })),
    },
  });
}
