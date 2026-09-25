import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashAdminPassword } from '@/lib/admin-auth';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { clientActivationUrl, createClientInvite } from '@/lib/client-invite';

const optionalDate = z.string().trim().optional().default('').refine(
  (value) => !value || !Number.isNaN(Date.parse(value)),
  'Invalid date',
);

const schema = z.object({
  organizationName: z.string().trim().min(2).max(180).optional(),
  projectName: z.string().trim().min(2).max(240).optional(),
  manager: z.string().trim().max(180).optional().default(''),
  startDate: optionalDate,
  targetDate: optionalDate,
  expiryDate: optionalDate,
  nextRenewalDate: optionalDate,
  renewalCycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom']).optional().default('annual'),
  renewalCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().default('GHS'),
  renewalAmount: z.coerce.number().min(0).max(999999999999).optional().default(0),
  budgetCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().default('GHS'),
  budgetAmount: z.coerce.number().min(0).max(999999999999).optional().default(0),
  autoRenew: z.boolean().optional().default(false),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional().default(30),
  renewalNotes: z.string().trim().max(4000).optional().default(''),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveAdminContext(request);
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
      activationUrl = clientActivationUrl(invite.token, request.nextUrl.origin);
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
      activationUrl = clientActivationUrl(invite.token, request.nextUrl.origin);
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
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : new Date(),
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        nextRenewalDate: parsed.data.nextRenewalDate ? new Date(parsed.data.nextRenewalDate) : null,
        renewalCycle: parsed.data.renewalCycle,
        renewalCurrency: parsed.data.renewalCurrency,
        renewalAmount: parsed.data.renewalAmount,
        budgetCurrency: parsed.data.budgetCurrency,
        budgetAmount: parsed.data.budgetAmount,
        autoRenew: parsed.data.autoRenew,
        renewalNoticeDays: parsed.data.renewalNoticeDays,
        renewalNotes: parsed.data.renewalNotes || proposal.commercialNotes,
      },
    });

    await db.lead.update({
      where: { id: proposal.leadId },
      data: { status: 'won', lastContactedAt: new Date() },
    });

    await recordAdminAudit({
      admin: session,
      action: 'admin.proposal_converted_to_client',
      entity: 'Proposal',
      entityId: proposal.id,
      details: {
        organizationId: organization.id,
        projectId: project.id,
        leadId: proposal.leadId,
        budgetCurrency: project.budgetCurrency,
        budgetAmount: project.budgetAmount.toFixed(2),
        renewalCurrency: project.renewalCurrency,
        renewalAmount: project.renewalAmount.toFixed(2),
        renewalCycle: project.renewalCycle,
        autoRenew: project.autoRenew,
      },
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
