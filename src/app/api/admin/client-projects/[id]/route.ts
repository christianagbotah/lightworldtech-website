import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  name: z.string().trim().min(2).max(220).optional(),
  summary: z.string().trim().max(4000).optional(),
  status: z.enum(['planned', 'active', 'on_hold', 'completed']).optional(),
  health: z.enum(['on_track', 'attention', 'at_risk']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  manager: z.string().trim().max(180).optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  nextRenewalDate: z.string().datetime().nullable().optional(),
  renewalCycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom']).optional(),
  renewalCurrency: z.string().trim().max(3).optional(),
  renewalAmount: z.coerce.number().min(0).max(999999999999).optional(),
  budgetCurrency: z.string().trim().max(3).optional(),
  budgetAmount: z.coerce.number().min(0).max(999999999999).optional(),
  autoRenew: z.boolean().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  renewalNotes: z.string().trim().max(8000).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid project update', details: parsed.error.flatten() }, { status: 400 });

  const existing = await db.clientProject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  if (parsed.data.targetDate !== undefined) data.targetDate = parsed.data.targetDate ? new Date(parsed.data.targetDate) : null;
  if (parsed.data.expiryDate !== undefined) data.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
  if (parsed.data.nextRenewalDate !== undefined) data.nextRenewalDate = parsed.data.nextRenewalDate ? new Date(parsed.data.nextRenewalDate) : null;
  if (parsed.data.renewalCurrency !== undefined) data.renewalCurrency = normalizeCurrency(parsed.data.renewalCurrency);
  if (parsed.data.budgetCurrency !== undefined) data.budgetCurrency = normalizeCurrency(parsed.data.budgetCurrency);
  const project = await db.clientProject.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: project });
}
