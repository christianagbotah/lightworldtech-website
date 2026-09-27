import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  MAX_VENDOR_PAYMENT_ATTACHMENT_BYTES,
  createVendorPaymentAttachmentStorageName,
  detectVendorPaymentAttachment,
  sanitizeVendorPaymentAttachmentName,
  vendorPaymentAttachmentDirectory,
} from '@/lib/vendor-payment-attachment';

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
  const approval = await db.financeOutflowApproval.findUnique({
    where: { id },
    select: { id: true, requestNumber: true, outflowType: true, status: true },
  });
  if (!approval) return NextResponse.json({ success: false, error: 'Approval request not found' }, { status: 404 });
  if (approval.outflowType !== 'vendor_payment') {
    return NextResponse.json({ success: false, error: 'Payment proof can only be attached to supplier payment approvals' }, { status: 409 });
  }
  if (approval.status !== 'pending') {
    return NextResponse.json({ success: false, error: 'Payment proof can only be added while the approval is pending' }, { status: 409 });
  }

  let storagePath = '';
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A payment proof file is required' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ success: false, error: 'The payment proof file is empty' }, { status: 400 });
    }
    if (file.size > MAX_VENDOR_PAYMENT_ATTACHMENT_BYTES) {
      return NextResponse.json({ success: false, error: 'Payment proof too large. Max 10MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectVendorPaymentAttachment(bytes);
    if (!detected) {
      return NextResponse.json({ success: false, error: 'Upload a valid PDF, JPG, PNG or WebP payment proof.' }, { status: 415 });
    }
    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json({ success: false, error: 'Payment proof content does not match its declared type.' }, { status: 415 });
    }

    const directory = vendorPaymentAttachmentDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const storageName = createVendorPaymentAttachmentStorageName(detected);
    storagePath = join(directory, storageName);
    await writeFile(storagePath, bytes, { flag: 'wx', mode: 0o640 });
    const attachment = await db.financeOutflowApprovalAttachment.create({
      data: {
        approvalId: approval.id,
        originalName: sanitizeVendorPaymentAttachmentName(file.name),
        storageName,
        mimeType: detected.mimeType,
        sizeBytes: bytes.byteLength,
        uploadedBy: actor.name || actor.email,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.finance_outflow_approval_attachment_added',
      entity: 'FinanceOutflowApproval',
      entityId: approval.id,
      details: {
        requestNumber: approval.requestNumber,
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        downloadUrl: '/api/admin/finance/approval-attachments/' + attachment.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) await unlink(storagePath).catch(() => undefined);
    console.error('Outflow approval proof upload failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to upload approval payment proof' }, { status: 500 });
  }
}