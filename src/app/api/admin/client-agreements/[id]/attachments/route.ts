import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  MAX_AGREEMENT_ATTACHMENT_BYTES,
  agreementAttachmentDirectory,
  createAgreementAttachmentStorageName,
  detectAgreementAttachment,
  sanitizeAgreementAttachmentName,
} from '@/lib/agreement-attachment';

export const runtime = 'nodejs';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'clients.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const agreement = await db.clientAgreement.findUnique({
    where: { id },
    select: { id: true, title: true, organizationId: true },
  });
  if (!agreement) {
    return NextResponse.json({ success: false, error: 'Agreement not found' }, { status: 404 });
  }

  let storagePath = '';
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'A PDF file is required' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ success: false, error: 'The file is empty' }, { status: 400 });
    }
    if (file.size > MAX_AGREEMENT_ATTACHMENT_BYTES) {
      return NextResponse.json({ success: false, error: 'Agreement file too large. Max 15MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectAgreementAttachment(bytes);
    if (!detected) {
      return NextResponse.json(
        { success: false, error: 'Unsupported agreement file. Upload a valid PDF.' },
        { status: 415 },
      );
    }
    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json(
        { success: false, error: 'Agreement file content does not match its declared type.' },
        { status: 415 },
      );
    }

    const directory = agreementAttachmentDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const storageName = createAgreementAttachmentStorageName();
    storagePath = join(directory, storageName);
    await writeFile(storagePath, bytes, { flag: 'wx', mode: 0o640 });

    const attachment = await db.clientAgreementAttachment.create({
      data: {
        agreementId: agreement.id,
        originalName: sanitizeAgreementAttachmentName(file.name),
        storageName,
        mimeType: detected.mimeType,
        sizeBytes: bytes.byteLength,
        uploadedBy: actor.name || actor.email,
      },
    });

    await recordAdminAudit({
      admin: actor,
      action: 'admin.client_agreement_attachment_added',
      entity: 'ClientAgreement',
      entityId: agreement.id,
      details: {
        organizationId: agreement.organizationId,
        agreementTitle: agreement.title,
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
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
        downloadUrl: '/api/agreement-attachments/' + attachment.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) await unlink(storagePath).catch(() => undefined);
    console.error('Agreement attachment upload failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to upload agreement file' },
      { status: 500 },
    );
  }
}