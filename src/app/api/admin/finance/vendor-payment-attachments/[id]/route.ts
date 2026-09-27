import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  isSafeVendorPaymentAttachmentStorageName,
  vendorPaymentAttachmentDirectory,
} from '@/lib/vendor-payment-attachment';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const attachment = await db.financeVendorPaymentAttachment.findUnique({
    where: { id },
    include: { payment: { select: { id: true, paymentNumber: true, vendorId: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Supplier payment proof not found' }, { status: 404 });
  }
  if (!isSafeVendorPaymentAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Payment proof storage reference is invalid' }, { status: 500 });
  }

  try {
    const bytes = await readFile(join(vendorPaymentAttachmentDirectory(), attachment.storageName));
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_supplier_payment_attachment_downloaded',
      entity: 'FinanceVendorPayment',
      entityId: attachment.payment.id,
      details: {
        paymentNumber: attachment.payment.paymentNumber,
        vendorId: attachment.payment.vendorId,
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      },
    });

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(attachment.originalName),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Supplier payment proof download failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to read supplier payment proof' }, { status: 500 });
  }
}