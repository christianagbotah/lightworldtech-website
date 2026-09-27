import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  isSafeVendorBillAttachmentStorageName,
  vendorBillAttachmentDirectory,
} from '@/lib/vendor-bill-attachment';

export const runtime = 'nodejs';

async function authorizedAdmin(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) return null;
  return actor;
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await authorizedAdmin(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const attachment = await db.financeVendorBillAttachment.findUnique({
    where: { id },
    include: { bill: { select: { id: true, payableNumber: true, vendorId: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Supplier invoice attachment not found' }, { status: 404 });
  }
  if (!isSafeVendorBillAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Attachment storage reference is invalid' }, { status: 500 });
  }

  try {
    const bytes = await readFile(join(vendorBillAttachmentDirectory(), attachment.storageName));
    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_supplier_bill_attachment_downloaded',
      entity: 'FinanceVendorBill',
      entityId: attachment.bill.id,
      details: { payableNumber: attachment.bill.payableNumber, attachmentId: attachment.id },
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
    console.error('Supplier bill attachment download failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to read supplier invoice attachment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await authorizedAdmin(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const attachment = await db.financeVendorBillAttachment.findUnique({
    where: { id },
    include: { bill: { select: { id: true, payableNumber: true, status: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Supplier invoice attachment not found' }, { status: 404 });
  }
  if (!isSafeVendorBillAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Attachment storage reference is invalid' }, { status: 500 });
  }
  if (attachment.bill.status === 'paid') {
    return NextResponse.json({ success: false, error: 'Evidence for a paid supplier bill cannot be deleted' }, { status: 409 });
  }

  await db.financeVendorBillAttachment.delete({ where: { id } });
  await unlink(join(vendorBillAttachmentDirectory(), attachment.storageName)).catch(() => undefined);

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_bill_attachment_deleted',
    entity: 'FinanceVendorBill',
    entityId: attachment.bill.id,
    details: { payableNumber: attachment.bill.payableNumber, attachmentId: attachment.id },
  });

  return NextResponse.json({ success: true, data: { id: attachment.id } });
}