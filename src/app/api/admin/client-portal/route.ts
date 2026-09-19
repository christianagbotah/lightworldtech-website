import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

const dateValue = z.string().datetime().nullable().optional();

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create-project'),
    clientId: z.string().min(1),
    name: z.string().trim().min(2).max(180),
    summary: z.string().trim().max(5000).default(''),
    status: z.enum(['planned', 'active', 'on-hold', 'completed']).default('active'),
    progress: z.number().int().min(0).max(100).default(0),
    startDate: dateValue,
    targetDate: dateValue,
  }),
  z.object({
    action: z.literal('update-project'),
    id: z.string().min(1),
    name: z.string().trim().min(2).max(180).optional(),
    summary: z.string().trim().max(5000).optional(),
    status: z.enum(['planned', 'active', 'on-hold', 'completed']).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: dateValue,
    targetDate: dateValue,
  }),
  z.object({
    action: z.literal('create-milestone'),
    projectId: z.string().min(1),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(3000).default(''),
    status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
    dueDate: dateValue,
    order: z.number().int().min(0).max(10000).default(0),
  }),
  z.object({
    action: z.literal('update-milestone'),
    id: z.string().min(1),
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(3000).optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).optional(),
    dueDate: dateValue,
    order: z.number().int().min(0).max(10000).optional(),
  }),
  z.object({
    action: z.literal('create-deliverable'),
    projectId: z.string().min(1),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(3000).default(''),
    url: z.string().trim().max(2000).default(''),
    status: z.enum(['available', 'review', 'approved', 'archived']).default('available'),
    deliveredAt: dateValue,
  }),
  z.object({
    action: z.literal('update-deliverable'),
    id: z.string().min(1),
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(3000).optional(),
    url: z.string().trim().max(2000).optional(),
    status: z.enum(['available', 'review', 'approved', 'archived']).optional(),
    deliveredAt: dateValue,
  }),
  z.object({
    action: z.literal('update-ticket'),
    id: z.string().min(1),
    status: z.enum(['open', 'in-progress', 'waiting-client', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    adminResponse: z.string().trim().max(5000).optional(),
  }),
]);

function dateOrNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid portal action.', details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    if (input.action === 'create-project') {
      const client = await db.portalClient.findUnique({ where: { id: input.clientId }, select: { id: true } });
      if (!client) return NextResponse.json({ success: false, error: 'Client not found.' }, { status: 404 });

      const data = await db.clientProject.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          summary: input.summary,
          status: input.status,
          progress: input.progress,
          startDate: dateOrNull(input.startDate),
          targetDate: dateOrNull(input.targetDate),
        },
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    if (input.action === 'update-project') {
      const data = await db.clientProject.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.progress !== undefined ? { progress: input.progress } : {}),
          ...(input.startDate !== undefined ? { startDate: dateOrNull(input.startDate) } : {}),
          ...(input.targetDate !== undefined ? { targetDate: dateOrNull(input.targetDate) } : {}),
        },
      });
      return NextResponse.json({ success: true, data });
    }

    if (input.action === 'create-milestone') {
      const data = await db.clientMilestone.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          status: input.status,
          dueDate: dateOrNull(input.dueDate),
          order: input.order,
        },
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    if (input.action === 'update-milestone') {
      const data = await db.clientMilestone.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.dueDate !== undefined ? { dueDate: dateOrNull(input.dueDate) } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
        },
      });
      return NextResponse.json({ success: true, data });
    }

    if (input.action === 'create-deliverable') {
      const project = await db.clientProject.findUnique({ where: { id: input.projectId }, select: { id: true } });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });

      const data = await db.clientDeliverable.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          url: input.url,
          status: input.status,
          deliveredAt: dateOrNull(input.deliveredAt),
        },
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    if (input.action === 'update-deliverable') {
      const data = await db.clientDeliverable.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.deliveredAt !== undefined ? { deliveredAt: dateOrNull(input.deliveredAt) } : {}),
        },
      });
      return NextResponse.json({ success: true, data });
    }

    const data = await db.clientTicket.update({
      where: { id: input.id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.adminResponse !== undefined ? { adminResponse: input.adminResponse } : {}),
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin client portal action error:', error);
    return NextResponse.json({ success: false, error: 'Could not complete portal action.' }, { status: 500 });
  }
}
