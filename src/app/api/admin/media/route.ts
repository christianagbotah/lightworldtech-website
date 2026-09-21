import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  imageUploadContentType,
  isSafeImageUploadFilename,
  uploadStorageDirectory,
} from '@/lib/upload-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReferenceCheck = {
  label: string;
  count: number;
};

async function mediaReferences(filename: string): Promise<ReferenceCheck[]> {
  const [
    services,
    teamMembers,
    testimonials,
    blogPosts,
    portfolioProjects,
    clients,
    settings,
    clientDocuments,
  ] = await Promise.all([
    db.service.count({ where: { image: { contains: filename } } }),
    db.teamMember.count({ where: { image: { contains: filename } } }),
    db.testimonial.count({ where: { image: { contains: filename } } }),
    db.blogPost.count({ where: { coverImage: { contains: filename } } }),
    db.portfolioProject.count({ where: { image: { contains: filename } } }),
    db.client.count({ where: { logo: { contains: filename } } }),
    db.siteSetting.count({ where: { value: { contains: filename } } }),
    db.clientDocument.count({ where: { url: { contains: filename } } }),
  ]);

  return [
    { label: 'Services', count: services },
    { label: 'Team members', count: teamMembers },
    { label: 'Testimonials', count: testimonials },
    { label: 'Blog posts', count: blogPosts },
    { label: 'Portfolio projects', count: portfolioProjects },
    { label: 'Client logos', count: clients },
    { label: 'Page/settings content', count: settings },
    { label: 'Client documents', count: clientDocuments },
  ].filter((item) => item.count > 0);
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const directory = uploadStorageDirectory();
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          data: { items: [], totalFiles: 0, totalBytes: 0 },
        });
      }
      throw error;
    }

    const items = (
      await Promise.all(
        entries
          .filter((entry) => entry.isFile() && isSafeImageUploadFilename(entry.name))
          .map(async (entry) => {
            const mimeType = imageUploadContentType(entry.name);
            if (!mimeType) return null;

            try {
              const info = await stat(join(directory, entry.name));
              const createdAt =
                Number.isFinite(info.birthtimeMs) && info.birthtimeMs > 0
                  ? info.birthtime
                  : info.mtime;

              return {
                filename: entry.name,
                url: '/uploads/' + entry.name,
                mimeType,
                sizeBytes: info.size,
                createdAt: createdAt.toISOString(),
                modifiedAt: info.mtime.toISOString(),
              };
            } catch (error) {
              if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
              throw error;
            }
          }),
      )
    )
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort(
        (a, b) =>
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      );

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalFiles: items.length,
        totalBytes: items.reduce((sum, item) => sum + item.sizeBytes, 0),
      },
    });
  } catch (error) {
    console.error('Media library listing failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load the media library.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const filename =
    body && typeof body.filename === 'string' ? body.filename.trim() : '';

  if (!isSafeImageUploadFilename(filename)) {
    return NextResponse.json(
      { success: false, error: 'Invalid media filename.' },
      { status: 400 },
    );
  }

  try {
    const references = await mediaReferences(filename);
    if (references.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This image is still in use. Remove its content references before deleting it.',
          references,
        },
        { status: 409 },
      );
    }

    try {
      await unlink(join(uploadStorageDirectory(), filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Media file not found.' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Media library deletion failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to delete the media file.' },
      { status: 500 },
    );
  }
}
