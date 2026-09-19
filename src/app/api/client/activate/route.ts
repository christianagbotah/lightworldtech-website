import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import { consumePublicRateLimit } from '@/lib/public-rate-limit';
import { hashClientInviteToken } from '@/lib/client-invite';

const activateSchema = z.object({
  token: z.string().trim().min(20).max(300),
  password: z.string().min(10).max(256),
});

export async function POST(request: NextRequest) {
  const rate = consumePublicRateLimit(request, 'client-activate', 12, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many activation attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = activateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid activation request' }, { status: 400 });
    }

    const tokenHash = hashClientInviteToken(parsed.data.token);
    const user = await db.clientPortalUser.findFirst({
      where: {
        inviteTokenHash: tokenHash,
        active: true,
        inviteExpiresAt: { gt: new Date() },
      },
      include: { organization: { select: { status: true } } },
    });

    if (!user || user.organization.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Activation link is invalid or expired' }, { status: 400 });
    }

    await db.clientPortalUser.update({
      where: { id: user.id },
      data: {
        password: hashAdminPassword(parsed.data.password),
        inviteTokenHash: '',
        inviteExpiresAt: null,
        mustSetPassword: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client activation error:', error);
    return NextResponse.json({ success: false, error: 'Unable to activate portal account' }, { status: 500 });
  }
}
