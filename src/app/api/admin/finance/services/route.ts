import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { normalizeCurrency } from '@/lib/finance';

const schema = z.object({
  organizationId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2).max(180),
  serviceType: z.string().trim().min(2).max(80).default('managed_service'),
  planName: z.string().trim().max(120).default(''),
  status: z.enum(['pending', 'active', 'suspended', 'expired', 'cancelled']).default('active'),
  billingCycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'custom']).default('annual'),
  currency: z.string().trim().max(3).default('GHS'),
  recurringAmount: z.coerce.number().min(0).max(999999999999),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date().nullable().optional(),
  nextDueDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.coerce.number().int().min(0).max(365).default(30),
  notes: z.string().trim().max(8000).default(''),
});

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') || undefined;
  const status = searchParams.get('status') || undefined;
  const q = searchParams.get('q')?.trim();

  const services = await db.clientServiceAccount.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { planName: { contains: q, mode: 'insensitive' } },
          { organization: { name: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    orderBy: [{ nextDueDate: 'asc' }, { expiryDate: 'asc' }, { updatedAt: 'desc' }],
    include: {
      organization: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      changes: { orderBy: { effectiveAt: 'desc' }, take: 20 },
      _count: { select: { invoices: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    success: true,
    data: services.map((service) => ({
      ...service,
      recurringAmount: service.recurringAmount.toFixed(2),
      changes: service.changes.map((change) => ({
        ...change,
        previousAmount: change.previousAmount?.toFixed(2) ?? null,
        newAmount: change.newAmount?.toFixed(2) ?? null,
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid service account', details: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await db.clientOrganization.findUnique({ where: { id: parsed.data.organizationId }, select: { id: true } });
  if (!organization) return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });

  if (parsed.data.projectId) {
    const project = await db.clientProject.findFirst({
      where: { id: parsed.data.projectId, organizationId: parsed.data.organizationId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ success: false, error: 'Project does not belong to this client' }, { status: 400 });
  }

  const service = await db.clientServiceAccount.create({
    data: {
      organizationId: parsed.data.organizationId,
      projectId: parsed.data.projectId || null,
      name: parsed.data.name,
      serviceType: parsed.data.serviceType,
      planName: parsed.data.planName,
      status: parsed.data.status,
      billingCycle: parsed.data.billingCycle,
      currency: normalizeCurrency(parsed.data.currency),
      recurringAmount: parsed.data.recurringAmount,
      startDate: parsed.data.startDate,
      expiryDate: parsed.data.expiryDate || null,
      nextDueDate: parsed.data.nextDueDate || null,
      autoRenew: parsed.data.autoRenew,
      renewalNoticeDays: parsed.data.renewalNoticeDays,
      notes: parsed.data.notes,
      changes: {
        create: {
          changeType: 'created',
          newPlan: parsed.data.planName,
          newAmount: parsed.data.recurringAmount,
          effectiveAt: parsed.data.startDate,
          notes: parsed.data.notes,
          changedBy: actor.name || actor.email,
        },
      },
    },
  });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_service_created',
    entity: 'ClientServiceAccount',
    entityId: service.id,
    details: { organizationId: service.organizationId, serviceName: service.name, planName: service.planName },
  });

  return NextResponse.json({ success: true, data: { ...service, recurringAmount: service.recurringAmount.toFixed(2) } }, { status: 201 });
}
