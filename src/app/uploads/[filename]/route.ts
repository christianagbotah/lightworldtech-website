import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import {
  imageUploadContentType,
  isSafeImageUploadFilename,
  uploadStorageDirectory,
} from '@/lib/upload-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!isSafeImageUploadFilename(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const contentType = imageUploadContentType(filename);
  if (!contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const bytes = await readFile(join(uploadStorageDirectory(), filename));

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.error('Uploaded image read error:', error);
    return NextResponse.json({ error: 'Unable to load image' }, { status: 500 });
  }
}
