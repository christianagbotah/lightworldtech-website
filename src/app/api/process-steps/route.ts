import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all process steps
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');

    const steps = await db.processStep.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching process steps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch process steps' },
      { status: 500 }
    );
  }
}

// POST create process step
const createProcessStepSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  icon: z.string().optional().default(''),
  order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProcessStepSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const step = await db.processStep.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: step }, { status: 201 });
  } catch (error) {
    console.error('Error creating process step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create process step' },
      { status: 500 }
    );
  }
}
