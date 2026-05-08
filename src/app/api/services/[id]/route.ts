import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await db.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT update service
const updateServiceSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  features: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check service exists
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug if slug is being updated
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const duplicate = await db.service.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A service with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const service = await db.service.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    await db.service.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
