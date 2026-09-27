import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import {
  isSafeProcurementAttachmentStorageName,
  procurementAttachmentDirectory,
} from '@/lib/procurement-attachment';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const attachment = await db.financeSupplierQuoteAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ success: false, error: 'Quotation attachment not found' }, { status: 404 });
  }
  if (!isSafeProcurementAttachmentStorageName(attachment.storageName)) {
    return NextResponse.json({ success: false, error: 'Quotation storage reference is invalid' }, { status: 500 });
  }

  try {
    const bytes = await readFile(join(procurementAttachmentDirectory(), attachment.storageName));
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
    console.error('Supplier quote evidence download failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to read quotation attachment' }, { status: 500 });
  }
}
