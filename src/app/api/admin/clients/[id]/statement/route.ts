import { NextRequest, NextResponse } from 'next/server';
import { getActiveAdminContext, recordAdminAudit } from '@/lib/admin-governance';
import { hasAdminPermission } from '@/lib/admin-permissions';
import { buildCustomerAccountStatement } from '@/lib/customer-statement';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActiveAdminContext(request);
  if (!actor || !hasAdminPermission(actor.role, actor.permissions, 'finance.manage')) {
    return NextResponse.json({ success: false, error: 'Finance permission required' }, { status: 403 });
  }

  const { id } = await params;
  const statement = await buildCustomerAccountStatement(id);
  if (!statement) return NextResponse.json({ success: false, error: 'Client organization not found' }, { status: 404 });

  await recordAdminAudit({
    admin: actor,
    action: 'admin.client_account_statement_downloaded',
    entity: 'ClientOrganization',
    entityId: id,
    details: { organizationName: statement.organizationName, filename: statement.filename },
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
