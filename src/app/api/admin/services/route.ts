import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const services = await db.service.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, description, icon, features, order, active } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const service = await db.service.create({
      data: {
        title,
        slug,
        description: description || '',
        icon: icon || '',
        features: features || '[]',
        order: order || 0,
        active: active !== false,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create service';
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
