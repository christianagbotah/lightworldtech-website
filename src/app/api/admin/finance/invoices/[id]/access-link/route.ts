import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  createInvoiceAccessToken,
  invoiceAccessUrl,
} from '@/lib/invoice-access-link';

const schema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(90).default(30),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid secure-link request' }, { status: 400 });
  }

  const { id } = await params;
  const invoice = await db.clientInvoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      organizationId: true,
    },
  });
  if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  if (['draft', 'void'].includes(invoice.status)) {
    return NextResponse.json({ success: false, error: 'Only issued invoices can have a secure customer link' }, { status: 409 });
  }

  const access = createInvoiceAccessToken(parsed.data.expiresInDays);
  const createdBy = actor.name || actor.email;

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
  });

  const url = invoiceAccessUrl(access.token, request.nextUrl.origin);

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_invoice_secure_link_rotated',
    entity: 'ClientInvoice',
    entityId: invoice.id,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      organizationId: invoice.organizationId,
      accessLinkId: link.id,
      expiresAt: link.expiresAt.toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    data: { url, link },
  }, { status: 201 });
}
