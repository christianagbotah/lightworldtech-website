import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { invoiceBalance } from '@/lib/finance';
import {
  createInvoiceAccessToken,
  invoiceAccessUrl,
  invoiceDeliveryMail,
} from '@/lib/invoice-access-link';
import {
  getMailTransportStatus,
  sanitizeMailError,
  sendTransactionalMail,
} from '@/lib/mail';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (
    !actor ||
    !hasAdminPermission(actor.role, actor.permissions, 'finance.manage') ||
    !hasAdminPermission(actor.role, actor.permissions, 'communications.manage')
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!getMailTransportStatus().configured) {
    return NextResponse.json({ success: false, error: 'Outbound email is not configured' }, { status: 503 });
  }

  const { id } = await params;
  const invoice = await db.clientInvoice.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          primaryContactName: true,
          primaryEmail: true,
        },
      },
      allocations: true,
      creditNotes: { where: { status: 'posted' } },
    },
  });
  if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  if (['draft', 'void'].includes(invoice.status)) {
    return NextResponse.json({ success: false, error: 'Only issued invoices can be emailed' }, { status: 409 });
  }

  const recipient = invoice.organization.primaryEmail.trim().toLowerCase();
  if (!recipient) {
    return NextResponse.json({ success: false, error: 'This customer has no primary email address' }, { status: 409 });
  }

  const access = createInvoiceAccessToken(30);
  const createdBy = actor.name || actor.email;
  const balance = invoiceBalance(invoice.total, invoice.allocations, invoice.creditNotes);

  const link = await db.$transaction(async (tx) => {
    await tx.invoiceAccessLink.updateMany({
      where: {
        invoiceId: invoice.id,
        status: 'active',
        revokedAt: null,
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });
    return tx.invoiceAccessLink.create({
      data: {
        invoiceId: invoice.id,
        tokenHash: access.tokenHash,
        expiresAt: access.expiresAt,
        createdBy,
      },
    });
  });

  const url = invoiceAccessUrl(access.token, request.nextUrl.origin);

  try {
    const result = await sendTransactionalMail(invoiceDeliveryMail({
      to: recipient,
      customer: invoice.organization.name,
      contactName: invoice.organization.primaryContactName,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      total: invoice.total.toFixed(2),
      balance: balance.toFixed(2),
      dueDate: invoice.dueDate,
      url,
    }));

    const delivered = await db.invoiceAccessLink.update({
      where: { id: link.id },
      data: {
        sentTo: recipient,
        sentCount: { increment: 1 },
        lastSentAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdBy: true,
        sentTo: true,
        sentCount: true,
        lastSentAt: true,
        firstViewedAt: true,
        lastViewedAt: true,
        viewCount: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_invoice_emailed',
      entity: 'ClientInvoice',
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        organizationId: invoice.organizationId,
        recipient,
        accessLinkId: link.id,
        expiresAt: access.expiresAt.toISOString(),
        transport: result.transport,
        balance: balance.toFixed(2),
        currency: invoice.currency,
      },
    });

    return NextResponse.json({
      success: true,
      data: { url, link: delivered, recipient },
    });
  } catch (error) {
    const safeError = sanitizeMailError(error);
    await db.invoiceAccessLink.update({
      where: { id: link.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    }).catch(() => undefined);

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_invoice_email_failed',
      entity: 'ClientInvoice',
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        organizationId: invoice.organizationId,
        recipient,
        accessLinkId: link.id,
        error: safeError,
      },
    });

    return NextResponse.json(
      { success: false, error: 'Invoice email could not be delivered', detail: safeError },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }
}
