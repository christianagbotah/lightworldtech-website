import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { z } from 'zod';

const settingsPayloadSchema = z
  .record(z.string().trim().min(1).max(180), z.string().max(100_000))
  .superRefine((value, context) => {
    if (Object.keys(value).length > 400) {
      context.addIssue({
        code: 'custom',
        message: 'Too many settings in one update',
      });
    }
  });

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await db.siteSetting.findMany({ orderBy: { group: 'asc' } });
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = settingsPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates = Object.entries(parsed.data).map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: guessGroup(key) },
      }),
    );

    if (updates.length > 0) {
      await db.$transaction(updates);
    }
    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

function guessGroup(key: string): string {
  if (key.startsWith('hero')) return 'hero';
  if (key.startsWith('about')) return 'about';
  if (key.includes('phone') || key.includes('address') || (key.includes('email') && !key.includes('contact'))) return 'contact';
  if (key.includes('contact')) return 'contact';
  if (['facebook', 'twitter', 'linkedin', 'instagram'].some(k => key.includes(k))) return 'social';
  if (['seo', 'meta'].some(k => key.includes(k))) return 'seo';
  if (['stat', 'counter'].some(k => key.includes(k))) return 'stats';
  return 'general';
}
