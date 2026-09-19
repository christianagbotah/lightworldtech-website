import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getClientSession, hashClientPassword, verifyClientPassword } from '@/lib/client-auth';

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
    if (!account?.active || !verifyClientPassword(account.password, parsed.data.currentPassword)) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    await db.clientPortalAccount.update({
      where: { id: account.id },
      data: {
        password: hashClientPassword(parsed.data.newPassword),
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Client password update failed:', error);
    return NextResponse.json({ success: false, error: 'Password update unavailable' }, { status: 500 });
  }
}
