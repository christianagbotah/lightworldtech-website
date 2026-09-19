import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
  getClientSession,
  hashClientPassword,
  verifyClientPassword,
} from '@/lib/client-auth';

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export async function PUT(request: NextRequest) {
  const session = getClientSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Use a new password of at least 12 characters.' },
        { status: 400 },
      );
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return NextResponse.json(
        { success: false, error: 'Choose a different new password.' },
        { status: 400 },
      );
    }

    const account = await db.clientPortalAccount.findUnique({ where: { id: session.sub } });
    if (!account?.active || account.sessionVersion !== session.ver || !verifyClientPassword(account.password, parsed.data.currentPassword)) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const updated = await db.clientPortalAccount.update({
      where: { id: account.id },
      data: {
        password: hashClientPassword(parsed.data.newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        sessionVersion: true,
      },
    });

    const token = createClientSessionToken({
      sub: updated.id,
      email: updated.email,
      name: updated.name,
      organization: updated.organization,
      ver: updated.sessionVersion,
    });

    const response = NextResponse.json({ success: true, message: 'Password updated' });
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
    console.error('Client password update failed:', error);
    return NextResponse.json({ success: false, error: 'Password update unavailable' }, { status: 500 });
  }
}
