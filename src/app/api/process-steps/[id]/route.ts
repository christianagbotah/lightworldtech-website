import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual process step
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const step = await db.processStep.findUnique({
      where: { id },
    });

    if (!step) {
      return NextResponse.json(
        { success: false, error: 'Process step not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error('Error fetching process step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch process step' },
      { status: 500 }
    );
  }
}

// PUT update process step
const updateProcessStepSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  icon: z.string().optional(),
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
    const parsed = updateProcessStepSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.processStep.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Process step not found' },
        { status: 404 }
      );
    }

    const step = await db.processStep.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error('Error updating process step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update process step' },
      { status: 500 }
    );
  }
}

// DELETE process step
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.processStep.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Process step not found' },
        { status: 404 }
      );
    }

    await db.processStep.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Process step deleted' });
  } catch (error) {
    console.error('Error deleting process step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete process step' },
      { status: 500 }
    );
  }
}
