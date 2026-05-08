import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
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
  try {
    const entries = await request.json() as Record<string, string>;

    const updates = Object.entries(entries).map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: guessGroup(key) },
      })
    );

    await Promise.all(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
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
