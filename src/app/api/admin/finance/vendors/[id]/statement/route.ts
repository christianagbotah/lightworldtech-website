import { NextRequest, NextResponse } from 'next/server';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { buildSupplierAccountStatement } from '@/lib/supplier-statement';

export const runtime = 'nodejs';

function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const parsed = new Date(value + (endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');
  const from = parseDate(fromRaw);
  const to = parseDate(toRaw, true);
  if (fromRaw && !from) return NextResponse.json({ success: false, error: 'Invalid statement start date' }, { status: 400 });
  if (toRaw && !to) return NextResponse.json({ success: false, error: 'Invalid statement end date' }, { status: 400 });
  if (from && to && from > to) {
    return NextResponse.json({ success: false, error: 'Statement start date cannot be after end date' }, { status: 400 });
  }

  const statement = await buildSupplierAccountStatement(id, { from, to });
  if (!statement) return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
  await recordAdminAudit({
    admin: actor,
    action: 'admin.finance_supplier_account_statement_downloaded',
    entity: 'FinanceVendor',
    entityId: id,
    details: {
      vendorName: statement.vendorName,
      filename: statement.filename,
      from: from?.toISOString() || null,
      to: to?.toISOString() || null,
    },
  });

  return new NextResponse(statement.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + statement.filename + '"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}