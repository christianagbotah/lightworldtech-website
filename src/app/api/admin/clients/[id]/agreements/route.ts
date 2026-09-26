import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  title: z.string().trim().min(2).max(220),
  agreementType: z.enum(['contract', 'statement_of_work', 'service_agreement', 'nda', 'license', 'other']).default('contract'),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'superseded']).default('draft'),
  referenceNumber: z.string().trim().max(120).optional().default(''),
  projectId: z.string().trim().nullable().optional(),
  currency: z.string().trim().max(3).optional().default('GHS'),
  contractValue: z.coerce.number().min(0).max(999999999999).optional().default(0),
  effectiveDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).optional().default(30),
  owner: z.string().trim().max(180).optional().default(''),
  documentUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  notes: z.string().trim().max(8000).optional().default(''),
  signedAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid agreement', details: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await db.clientOrganization.findUnique({ where: { id }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Selected project does not belong to this client' }, { status: 400 });
  }

  const agreement = await db.clientAgreement.create({
    data: {
      organizationId: id,
      projectId: parsed.data.projectId || null,
      title: parsed.data.title,
      agreementType: parsed.data.agreementType,
      status: parsed.data.status,
      referenceNumber: parsed.data.referenceNumber,
      currency: normalizeCurrency(parsed.data.currency),
      contractValue: parsed.data.contractValue,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      renewalNoticeDays: parsed.data.renewalNoticeDays,
      owner: parsed.data.owner,
      documentUrl: parsed.data.documentUrl,
      notes: parsed.data.notes,
      signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : null,
    },
  });

  return NextResponse.json({ success: true, data: agreement }, { status: 201 });
}
