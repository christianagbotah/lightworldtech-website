import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');

    const services = await db.service.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST create service
const createServiceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(1, 'Description is required'),
  icon: z.string().optional().default(''),
  image: z.string().optional().default(''),
  features: z.string().optional().default('[]'),
  order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await db.service.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A service with this slug already exists' },
        { status: 400 }
      );
    }

    const service = await db.service.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
