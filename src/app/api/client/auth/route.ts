import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
  getClientSession,
  verifyClientPassword,
} from '@/lib/client-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const account = await db.clientPortalAccount.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      organization: true,
      active: true,
      mustChangePassword: true,
      sessionVersion: true,
      lastLogin: true,
    },
  });

  if (!account?.active || account.sessionVersion !== session.ver) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionVersion: _sessionVersion, ...safeAccount } = account;
  return NextResponse.json({ success: true, data: safeAccount });
}

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-login', 10, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const account = await db.clientPortalAccount.findUnique({ where: { email } });

    if (!account?.active || !verifyClientPassword(account.password, parsed.data.password)) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    await db.clientPortalAccount.update({
      where: { id: account.id },
      data: { lastLogin: new Date() },
    });

    const token = createClientSessionToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      organization: account.organization,
      ver: account.sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: account.id,
        email: account.email,
        name: account.name,
        organization: account.organization,
        mustChangePassword: account.mustChangePassword,
      },
    });

    response.cookies.set({
      name: CLIENT_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Client login failed:', error);
    return NextResponse.json({ success: false, error: 'Login unavailable' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
