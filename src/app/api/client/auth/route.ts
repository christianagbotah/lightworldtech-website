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
  password: z.string().min(1),
});

function clearCookie(response: NextResponse) {
  response.cookies.set(CLIENT_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-login', 12, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Valid email and password are required.' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const client = await db.portalClient.findUnique({ where: { email } });

    if (!client || !client.active || !verifyClientPassword(client.password, parsed.data.password)) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = createClientSessionToken({
      sub: client.id,
      email: client.email,
      companyName: client.companyName,
      contactName: client.contactName,
    });

    await db.portalClient.update({
      where: { id: client.id },
      data: { lastLogin: new Date() },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: client.id,
        email: client.email,
        companyName: client.companyName,
        contactName: client.contactName,
      },
    });

    response.cookies.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Client login error:', error);
    return NextResponse.json({ success: false, error: 'Unable to sign in right now.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const client = await db.portalClient.findFirst({
    where: { id: session.sub, active: true },
    select: { id: true, email: true, companyName: true, contactName: true, lastLogin: true },
  });

  if (!client) {
    const response = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    clearCookie(response);
    return response;
  }

  return NextResponse.json({ success: true, data: client });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearCookie(response);
  return response;
}
