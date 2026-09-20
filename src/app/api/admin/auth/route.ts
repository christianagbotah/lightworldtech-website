import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  getAdminSession,
  hashAdminPassword,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { adminLoginSchema } from '@/lib/login-input';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await db.admin.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true, role: true, active: true, authVersion: true },
    });

    if (
      !admin?.active ||
      admin.email !== session.email ||
      admin.role !== session.role ||
      admin.authVersion !== session.authVersion
    ) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    console.error('Error validating admin session:', error);
    return NextResponse.json({ success: false, error: 'Session validation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'admin-login', 8, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many sign-in attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = adminLoginSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const admin = await db.admin.findUnique({ where: { email } });

    if (!admin || !admin.active) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const verification = verifyAdminPassword(admin.password, password);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const passwordUpdate = verification.needsUpgrade
      ? { password: hashAdminPassword(password) }
      : {};

    await db.admin.update({
      where: { id: admin.id },
      data: {
        ...passwordUpdate,
        lastLogin: new Date(),
      },
    });

    const token = createAdminSessionToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name || 'Admin',
      role: admin.role,
      authVersion: admin.authVersion,
    });

    await recordAdminAudit({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name || 'Admin',
        role: admin.role,
      },
      action: 'admin.login',
      entity: 'Admin',
      entityId: admin.id,
      details: { passwordUpgraded: verification.needsUpgrade },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name || 'Admin',
        role: admin.role,
      },
      message: 'Login successful',
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { success: false, error: 'Login unavailable' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (actor) {
    await recordAdminAudit({
      admin: actor,
      action: 'admin.logout',
      entity: 'Admin',
      entityId: actor.id,
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
