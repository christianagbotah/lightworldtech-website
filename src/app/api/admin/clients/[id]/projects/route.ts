import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  name: z.string().trim().min(2).max(220),
  summary: z.string().trim().max(4000).optional().default(''),
  status: z.enum(['planned', 'active', 'on_hold', 'completed']).default('planned'),
  health: z.enum(['on_track', 'attention', 'at_risk']).default('on_track'),
  progress: z.number().int().min(0).max(100).default(0),
  manager: z.string().trim().max(180).optional().default(''),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  nextRenewalDate: z.string().datetime().nullable().optional(),
  renewalCycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom']).optional(),
  renewalCurrency: z.string().trim().max(3).optional(),
  renewalAmount: z.coerce.number().min(0).max(999999999999).optional(),
  autoRenew: z.boolean().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  renewalNotes: z.string().trim().max(8000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid project', details: parsed.error.flatten() }, { status: 400 });

  const organization = await db.clientOrganization.findUnique({ where: { id }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

  const project = await db.clientProject.create({
    data: {
      organizationId: id,
      name: parsed.data.name,
      summary: parsed.data.summary,
      status: parsed.data.status,
      health: parsed.data.health,
      progress: parsed.data.progress,
      manager: parsed.data.manager,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      nextRenewalDate: parsed.data.nextRenewalDate ? new Date(parsed.data.nextRenewalDate) : null,
      renewalCycle: parsed.data.renewalCycle || 'annual',
      renewalCurrency: normalizeCurrency(parsed.data.renewalCurrency || 'GHS'),
      renewalAmount: parsed.data.renewalAmount ?? 0,
      autoRenew: parsed.data.autoRenew ?? false,
      renewalNoticeDays: parsed.data.renewalNoticeDays ?? 30,
      renewalNotes: parsed.data.renewalNotes || '',
    },
  });
  return NextResponse.json({ success: true, data: project }, { status: 201 });
}
