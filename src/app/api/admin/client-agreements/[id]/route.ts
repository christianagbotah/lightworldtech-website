import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { normalizeCurrency } from '@/lib/finance';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(220).optional(),
  agreementType: z.enum(['contract', 'statement_of_work', 'service_agreement', 'nda', 'license', 'other']).optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'superseded']).optional(),
  referenceNumber: z.string().trim().max(120).optional(),
  projectId: z.string().trim().nullable().optional(),
  currency: z.string().trim().max(3).optional(),
  contractValue: z.coerce.number().min(0).max(999999999999).optional(),
  effectiveDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  owner: z.string().trim().max(180).optional(),
  documentUrl: z.string().trim().url().or(z.literal('')).optional(),
  notes: z.string().trim().max(8000).optional(),
  signedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid agreement update', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.clientAgreement.findUnique({ where: { id }, select: { id: true, organizationId: true } });
  if (!existing) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: existing.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Selected project does not belong to this client' }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    ...(parsed.data.currency ? { currency: normalizeCurrency(parsed.data.currency) } : {}),
    ...(parsed.data.projectId !== undefined ? { projectId: parsed.data.projectId || null } : {}),
    ...(parsed.data.effectiveDate !== undefined ? { effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null } : {}),
    ...(parsed.data.expiryDate !== undefined ? { expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null } : {}),
    ...(parsed.data.signedAt !== undefined ? { signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : null } : {}),
  };

  const agreement = await db.clientAgreement.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: agreement });
}
