import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
  getClientSession,
} from '@/lib/client-auth';
import { hashAdminPassword, verifyAdminPassword } from '@/lib/admin-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';
import { clientLoginSchema } from '@/lib/login-input';

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-login', 15, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many sign-in attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = clientLoginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 });
    }

    const email = parsed.data.email;
    const user = await db.clientPortalUser.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.active || user.organization.status !== 'active' || user.mustSetPassword) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const verified = verifyAdminPassword(user.password, parsed.data.password);
    if (!verified.valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const updates: Record<string, unknown> = { lastLogin: new Date() };
    if (verified.needsUpgrade) updates.password = hashAdminPassword(parsed.data.password);
    await db.clientPortalUser.update({ where: { id: user.id }, data: updates });

    const token = createClientSessionToken({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        organization: { id: user.organization.id, name: user.organization.name },
      },
    });
    response.cookies.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('Client login error:', error);
    return NextResponse.json({ success: false, error: 'Unable to sign in' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.clientPortalUser.findUnique({
    where: { id: session.sub },
    include: { organization: true },
  });
  if (!user || !user.active || user.mustSetPassword || user.organization.status !== 'active' || user.organizationId !== session.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
      organization: { id: user.organization.id, name: user.organization.name },
    },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
