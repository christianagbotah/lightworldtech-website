import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// POST login
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const admin = await db.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!admin.active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Simple password check (plain text comparison)
    // In production, use bcrypt or similar hashing
    if (admin.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Return admin data (excluding password)
    const { password: _pw, ...adminData } = admin;

    return NextResponse.json({
      success: true,
      data: adminData,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
