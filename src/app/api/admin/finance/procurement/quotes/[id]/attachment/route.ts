import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  MAX_PROCUREMENT_ATTACHMENT_BYTES,
  createProcurementAttachmentStorageName,
  detectProcurementAttachment,
  procurementAttachmentDirectory,
  sanitizeProcurementAttachmentName,
} from '@/lib/procurement-attachment';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const quote = await db.financeSupplierQuote.findUnique({
    where: { id },
    include: {
      vendor: { select: { name: true } },
      request: { select: { id: true, requestNumber: true, purchaseOrder: { select: { id: true } } } },
    },
  });
  if (!quote) return NextResponse.json({ success: false, error: 'Supplier quote not found' }, { status: 404 });
  if (quote.request.purchaseOrder) {
    return NextResponse.json({ success: false, error: 'Quote evidence cannot be changed after purchase order issue' }, { status: 409 });
  }

  let storagePath = '';
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A supplier quotation PDF is required' }, { status: 400 });
    }
    if (file.size <= 0) return NextResponse.json({ success: false, error: 'The quotation file is empty' }, { status: 400 });
    if (file.size > MAX_PROCUREMENT_ATTACHMENT_BYTES) {
      return NextResponse.json({ success: false, error: 'Quotation file too large. Max 15MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectProcurementAttachment(bytes);
    if (!detected) {
      return NextResponse.json({ success: false, error: 'Upload a valid PDF quotation.' }, { status: 415 });
    }
    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json({ success: false, error: 'Quotation file content does not match its declared type.' }, { status: 415 });
    }

    const directory = procurementAttachmentDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const storageName = createProcurementAttachmentStorageName();
    storagePath = join(directory, storageName);
    await writeFile(storagePath, bytes, { flag: 'wx', mode: 0o640 });

    const attachment = await db.financeSupplierQuoteAttachment.create({
      data: {
        quoteId: quote.id,
        originalName: sanitizeProcurementAttachmentName(file.name),
        storageName,
        mimeType: detected.mimeType,
        sizeBytes: bytes.byteLength,
        uploadedById: actor.id,
        uploadedByName: actor.name || actor.email,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_supplier_quote_attachment_added',
      entity: 'FinanceSupplierQuote',
      entityId: quote.id,
      details: {
        requestNumber: quote.request.requestNumber,
        vendor: quote.vendor.name,
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedByName: attachment.uploadedByName,
        createdAt: attachment.createdAt,
        downloadUrl: '/api/admin/finance/procurement/quote-attachments/' + attachment.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) await unlink(storagePath).catch(() => undefined);
    console.error('Supplier quote evidence upload failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to upload supplier quotation evidence' }, { status: 500 });
  }
}
