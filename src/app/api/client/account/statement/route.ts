import { NextRequest, NextResponse } from 'next/server';
import { getActiveClientContext } from '@/lib/client-access';
import { buildCustomerAccountStatement } from '@/lib/customer-statement';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const context = await getActiveClientContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const statement = await buildCustomerAccountStatement(context.user.organizationId, { activeOnly: true });
  if (!statement) return NextResponse.json({ success: false, error: 'Client account not found' }, { status: 404 });

  return new NextResponse(statement.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + statement.filename + '"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
