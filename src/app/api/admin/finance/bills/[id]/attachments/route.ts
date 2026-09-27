import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  MAX_VENDOR_BILL_ATTACHMENT_BYTES,
  createVendorBillAttachmentStorageName,
  detectVendorBillAttachment,
  sanitizeVendorBillAttachmentName,
  vendorBillAttachmentDirectory,
} from '@/lib/vendor-bill-attachment';

export const runtime = 'nodejs';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const bill = await db.financeVendorBill.findUnique({
    where: { id },
    select: { id: true, payableNumber: true, vendorId: true },
  });
  if (!bill) {
    return NextResponse.json({ success: false, error: 'Supplier bill not found' }, { status: 404 });
  }

  let storagePath = '';
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A supplier invoice PDF is required' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ success: false, error: 'The supplier invoice file is empty' }, { status: 400 });
    }
    if (file.size > MAX_VENDOR_BILL_ATTACHMENT_BYTES) {
      return NextResponse.json({ success: false, error: 'Supplier invoice file too large. Max 15MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectVendorBillAttachment(bytes);
    if (!detected) {
      return NextResponse.json({ success: false, error: 'Upload a valid PDF supplier invoice.' }, { status: 415 });
    }
    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json({ success: false, error: 'Supplier invoice content does not match its declared type.' }, { status: 415 });
    }

    const directory = vendorBillAttachmentDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const storageName = createVendorBillAttachmentStorageName();
    storagePath = join(directory, storageName);
    await writeFile(storagePath, bytes, { flag: 'wx', mode: 0o640 });
    const attachment = await db.financeVendorBillAttachment.create({
      data: {
        billId: bill.id,
        originalName: sanitizeVendorBillAttachmentName(file.name),
        storageName,
        mimeType: detected.mimeType,
        sizeBytes: bytes.byteLength,
        uploadedBy: actor.name || actor.email,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_supplier_bill_attachment_added',
      entity: 'FinanceVendorBill',
      entityId: bill.id,
      details: {
        payableNumber: bill.payableNumber,
        vendorId: bill.vendorId,
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        downloadUrl: '/api/admin/finance/bill-attachments/' + attachment.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) await unlink(storagePath).catch(() => undefined);
    console.error('Supplier bill attachment upload failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to upload supplier invoice PDF' }, { status: 500 });
  }
}