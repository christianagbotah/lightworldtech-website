import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAdminSession, hashAdminPassword } from '@/lib/admin-auth';
import { createClientInvite } from '@/lib/client-invite';

const schema = z.object({
  organizationName: z.string().trim().min(2).max(180).optional(),
  projectName: z.string().trim().min(2).max(240).optional(),
  manager: z.string().trim().max(180).optional().default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid client conversion request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        clientProject: { include: { organization: true } },
        lead: { include: { contactMessage: true } },
      },
    });
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    if (proposal.status !== 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Only accepted proposals can be converted to a client workspace' },
        { status: 409 },
      );
    }

    if (proposal.clientProject) {
      return NextResponse.json({
        success: true,
        created: false,
        data: {
          organization: proposal.clientProject.organization,
          project: proposal.clientProject,
        },
      });
    }

    const contact = proposal.lead.contactMessage;
    const email = contact.email.trim().toLowerCase();

    let existingUser = await db.clientPortalUser.findUnique({
      where: { email },
      include: { organization: true },
    });

    let organization = existingUser?.organization || null;
    if (organization && organization.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'The existing client organization is inactive. Reactivate it before conversion.' },
        { status: 409 },
      );
    }

    if (!organization) {
      organization = await db.clientOrganization.findFirst({
        where: { primaryEmail: email },
      });
    }

    if (!organization) {
      organization = await db.clientOrganization.create({
        data: {
          name: parsed.data.organizationName || contact.name,
          primaryContactName: contact.name,
          primaryEmail: email,
          primaryPhone: contact.phone || '',
        },
      });
    }

    let activationUrl: string | undefined;
    if (!existingUser) {
      const invite = createClientInvite();
      existingUser = await db.clientPortalUser.create({
        data: {
          organizationId: organization.id,
          email,
          name: contact.name,
          role: 'client_admin',
          password: hashAdminPassword(randomBytes(32).toString('base64url')),
          inviteTokenHash: invite.tokenHash,
          inviteExpiresAt: invite.expiresAt,
          mustSetPassword: true,
        },
        include: { organization: true },
      });
      activationUrl = request.nextUrl.origin + '/client/activate?token=' + encodeURIComponent(invite.token);
    } else if (existingUser.mustSetPassword) {
      const invite = createClientInvite();
      existingUser = await db.clientPortalUser.update({
        where: { id: existingUser.id },
        data: {
          inviteTokenHash: invite.tokenHash,
          inviteExpiresAt: invite.expiresAt,
          mustSetPassword: true,
        },
        include: { organization: true },
      });
      activationUrl = request.nextUrl.origin + '/client/activate?token=' + encodeURIComponent(invite.token);
    }

    const project = await db.clientProject.create({
      data: {
        organizationId: organization.id,
        proposalId: proposal.id,
        name: parsed.data.projectName || proposal.title,
        summary: proposal.executiveSummary,
        status: 'active',
        health: 'on_track',
        progress: 0,
        manager: parsed.data.manager,
        startDate: new Date(),
      },
    });

    await db.lead.update({
      where: { id: proposal.leadId },
      data: { status: 'won', lastContactedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      created: true,
      data: {
        organization,
        project,
        portalUser: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          active: existingUser.active,
          mustSetPassword: existingUser.mustSetPassword,
        },
      },
      ...(activationUrl ? { activationUrl } : {}),
    }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'This proposal or portal account has already been converted' },
        { status: 409 },
      );
    }
    console.error('Proposal to client conversion error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create client workspace' }, { status: 500 });
  }
}
