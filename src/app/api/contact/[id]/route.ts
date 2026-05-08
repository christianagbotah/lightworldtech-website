import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET individual contact message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const message = await db.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching contact message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact message' },
      { status: 500 }
    );
  }
}

// PUT update contact message (mark as read, etc.)
const updateContactSchema = z.object({
  read: z.boolean().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = await db.contactMessage.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error('Error updating contact message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact message' },
      { status: 500 }
    );
  }
}

// DELETE contact message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    await db.contactMessage.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact message' },
      { status: 500 }
    );
  }
}
