import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword, isAdminRequest } from '@/lib/admin-auth';
import { clientActivationUrl, createClientInvite } from '@/lib/client-invite';

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().email(),
  role: z.enum(['client_admin', 'client_member']).default('client_admin'),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid portal user', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const organization = await db.clientOrganization.findUnique({ where: { id }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

    const invite = createClientInvite();
    const user = await db.clientPortalUser.create({
      data: {
        organizationId: id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        password: hashAdminPassword(randomBytes(32).toString('base64url')),
        role: parsed.data.role,
        inviteTokenHash: invite.tokenHash,
        inviteExpiresAt: invite.expiresAt,
        mustSetPassword: true,
      },
      select: {
        id: true, name: true, email: true, role: true, active: true,
        mustSetPassword: true, inviteExpiresAt: true, createdAt: true,
      },
    });

    const activationUrl = clientActivationUrl(invite.token, request.nextUrl.origin);
    return NextResponse.json({ success: true, data: user, activationUrl }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'That email already has a portal account' },
        { status: 409 },
      );
    }
    console.error('Create client portal user error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create portal user' }, { status: 500 });
  }
}
