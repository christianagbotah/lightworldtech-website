import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual setting by key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const setting = await db.siteSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

// PUT update individual setting by key
const updateSchema = z.object({
  value: z.string(),
  type: z.string().optional(),
  group: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { value, type, group } = parsed.data;

    const setting = await db.siteSetting.upsert({
      where: { key },
      update: { value, ...(type && { type }), ...(group && { group }) },
      create: { key, value, type: type || 'text', group: group || 'general' },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}
