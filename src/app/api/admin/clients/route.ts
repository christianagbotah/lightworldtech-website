import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { hashClientPassword } from '@/lib/client-auth';

const createSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(160),
  email: z.string().email(),
  password: z.string().min(12).max(200),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clients = await db.portalClient.findMany({
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { projects: true, tickets: true } },
        tickets: {
          where: { status: { not: 'closed' } },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: clients.map((client) => ({
        ...client,
        openTickets: client.tickets.length,
        tickets: undefined,
      })),
    });
  } catch (error) {
    console.error('Admin client list error:', error);
    return NextResponse.json({ success: false, error: 'Could not load portal clients.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid client details.', details: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await db.portalClient.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A portal client already uses this email.' }, { status: 409 });
    }

    const client = await db.portalClient.create({
      data: {
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        email,
        password: hashClientPassword(parsed.data.password),
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error) {
    console.error('Admin client create error:', error);
    return NextResponse.json({ success: false, error: 'Could not create portal client.' }, { status: 500 });
  }
}
