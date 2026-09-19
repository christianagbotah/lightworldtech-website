import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { hashClientPassword } from '@/lib/client-auth';

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(160).default(''),
  email: z.string().email(),
  temporaryPassword: z.string().min(12).max(200),
  leadId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [clients, projectCount, openTickets] = await Promise.all([
      db.clientPortalAccount.findMany({
        include: {
          lead: { select: { id: true, summary: true, status: true } },
          _count: { select: { projects: true, tickets: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      db.clientProject.count(),
      db.clientTicket.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: clients.map(({ password: _password, ...client }) => client),
      summary: {
        total: clients.length,
        active: clients.filter((client) => client.active).length,
        projects: projectCount,
        openTickets,
      },
    });
  } catch (error) {
    console.error('Admin client list failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load client portal accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid client account', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    if (parsed.data.leadId) {
      const lead = await db.lead.findUnique({
        where: { id: parsed.data.leadId },
        include: { clientPortalAccount: true },
      });
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      if (lead.clientPortalAccount) {
        return NextResponse.json({ error: 'This lead already has a client portal account' }, { status: 409 });
      }
    }

    const account = await db.clientPortalAccount.create({
      data: {
        name: parsed.data.name,
        organization: parsed.data.organization,
        email,
        password: hashClientPassword(parsed.data.temporaryPassword),
        leadId: parsed.data.leadId || null,
        mustChangePassword: true,
      },
      select: {
        id: true,
        leadId: true,
        email: true,
        name: true,
        organization: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    console.error('Admin client create failed:', error);
    const message = error instanceof Error && /unique/i.test(error.message)
      ? 'A client account already uses that email.'
      : 'Failed to create client account';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
