import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  MAX_IMAGE_UPLOAD_BYTES,
  createImageUploadFilename,
  detectImageUpload,
  uploadStorageDirectory,
} from '@/lib/upload-storage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'The uploaded file is empty' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageUpload(bytes);

    if (!detected) {
      return NextResponse.json(
        { error: 'Invalid image. Use JPG, PNG, GIF, or WebP.' },
        { status: 415 },
      );
    }

    if (file.type && file.type !== detected.mimeType) {
      return NextResponse.json(
        { error: 'The file content does not match its declared image type.' },
        { status: 415 },
      );
    }

    const directory = uploadStorageDirectory();
    await mkdir(directory, { recursive: true, mode: 0o750 });

    const filename = createImageUploadFilename(detected);
    await writeFile(join(directory, filename), bytes, { flag: 'wx', mode: 0o640 });

    return NextResponse.json({
      success: true,
      data: {
        url: '/uploads/' + filename,
        mimeType: detected.mimeType,
        size: bytes.byteLength,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'Unable to upload image' }, { status: 500 });
  }
}
