import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { ensureHistoricalLeads } from '@/lib/crm';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const actor = await getActiveAdminContext(request);
  if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureHistoricalLeads();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const q = searchParams.get('q')?.trim();
    const overdue = searchParams.get('overdue') === 'true';

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (overdue) {
      where.nextFollowUp = { lt: new Date() };
      where.status = status && status !== 'all' ? status : { notIn: ['won', 'lost'] };
    }
    if (q) {
      where.OR = [
        { summary: { contains: q } },
        { assignedTo: { contains: q } },
        { contactMessage: { name: { contains: q } } },
        { contactMessage: { email: { contains: q } } },
        { contactMessage: { subject: { contains: q } } },
      ];
    }

    const leads = await db.lead.findMany({
      where,
      include: { contactMessage: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });

    const rows: unknown[][] = [
      [
        'Lead ID', 'Status', 'Priority', 'Assigned To', 'Source',
        'Customer Name', 'Email', 'Phone', 'Subject', 'Summary', 'Tags',
        'Next Follow-up', 'Last Contacted', 'Created', 'Updated',
      ],
      ...leads.map((lead) => [
        lead.id,
        lead.status,
        lead.priority,
        lead.assignedTo,
        lead.source,
        lead.contactMessage.name,
        lead.contactMessage.email,
        lead.contactMessage.phone,
        lead.contactMessage.subject,
        lead.summary,
        lead.tags,
        lead.nextFollowUp?.toISOString() || '',
        lead.lastContactedAt?.toISOString() || '',
        lead.createdAt.toISOString(),
        lead.updatedAt.toISOString(),
      ]),
    ];

    await recordAdminAudit({
      admin: actor,
      action: 'admin.crm_exported',
      entity: 'Lead',
      details: {
        rowCount: leads.length,
        filters: {
          status: status || 'all',
          priority: priority || 'all',
          overdue,
          queryApplied: Boolean(q),
        },
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lightworld-crm-' + date + '.csv"',
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to export CRM leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export CRM leads' },
      { status: 500 },
    );
  }
}
