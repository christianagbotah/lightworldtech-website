import { NextRequest, NextResponse } from 'next/server';
import { finalizeHubtelPayment } from '@/lib/hubtel-payment';

function nestedData(body: Record<string, unknown>): Record<string, unknown> {
  const value = body.data ?? body.Data;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const data = nestedData(body);
  const clientReference = String(
    data.clientReference || data.ClientReference || body.clientReference || body.ClientReference || '',
  ).trim();
  const transactionId = String(
    data.transactionId || data.TransactionId || body.transactionId || body.TransactionId || '',
  ).trim();

  if (!clientReference) {
    return NextResponse.json({ success: false, error: 'Missing client reference' }, { status: 400 });
  }

  try {
    const result = await finalizeHubtelPayment(clientReference, transactionId || undefined);
    return NextResponse.json({
      success: true,
      data: {
        reference: clientReference,
        status: result.verifiedStatus,
        recorded: Boolean(result.payment),
        alreadyRecorded: result.alreadyRecorded,
      },
    });
  } catch (error) {
    console.error('Hubtel callback verification error:', error);
    return NextResponse.json({ success: false, error: 'Payment could not be verified' }, { status: 422 });
  }
}
