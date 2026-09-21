import 'server-only';

type HubtelCredentials = {
  clientId: string;
  clientSecret: string;
};

type JsonRecord = Record<string, unknown>;

export type HubtelSmsResult = {
  ok: boolean;
  providerMessageId: string;
  networkId: string;
  rate: number | null;
  status: string;
  raw: JsonRecord;
};

export type HubtelCheckoutResult = {
  checkoutUrl: string;
  checkoutDirectUrl: string;
  checkoutId: string;
  clientReference: string;
  raw: JsonRecord;
};

export type HubtelPaymentStatus = {
  paid: boolean;
  status: string;
  transactionId: string;
  externalTransactionId: string;
  paymentMethod: string;
  clientReference: string;
  currencyCode: string;
  amount: number | null;
  charges: number | null;
  amountAfterCharges: number | null;
  date: string;
  raw: JsonRecord;
};

export { normalizePhone, renderSmsTemplate, smsSegmentEstimate } from '@/lib/hubtel-utils';
import { normalizePhone } from '@/lib/hubtel-utils';

function basicAuth(credentials: HubtelCredentials): string {
  return 'Basic ' + Buffer.from(credentials.clientId + ':' + credentials.clientSecret).toString('base64');
}

function credentials(prefix: 'SMS' | 'PAYMENT' | 'OTP'): HubtelCredentials {
  const fallbackId = process.env.HUBTEL_CLIENT_ID || '';
  const fallbackSecret = process.env.HUBTEL_CLIENT_SECRET || '';
  const clientId = process.env['HUBTEL_' + prefix + '_CLIENT_ID'] || fallbackId;
  const clientSecret = process.env['HUBTEL_' + prefix + '_CLIENT_SECRET'] || fallbackSecret;
  if (!clientId || !clientSecret) {
    throw new Error('Hubtel ' + prefix.toLowerCase() + ' credentials are not configured');
  }
  return { clientId, clientSecret };
}

async function readJson(response: Response): Promise<JsonRecord> {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as JsonRecord : { value: parsed };
  } catch {
    return { rawText: text.slice(0, 4000) };
  }
}

function dataObject(raw: JsonRecord): JsonRecord {
  const data = raw.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data as JsonRecord : {};
}

function providerError(raw: JsonRecord, fallback: string): string {
  const data = dataObject(raw);
  for (const value of [raw.message, raw.Message, raw.status, raw.Status, data.message, data.Message]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

export function hubtelConfiguration() {
  return {
    sms: Boolean(
      (process.env.HUBTEL_SMS_CLIENT_ID || process.env.HUBTEL_CLIENT_ID) &&
      (process.env.HUBTEL_SMS_CLIENT_SECRET || process.env.HUBTEL_CLIENT_SECRET) &&
      (process.env.HUBTEL_SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID),
    ),
    otp: Boolean(
      (process.env.HUBTEL_OTP_CLIENT_ID || process.env.HUBTEL_SMS_CLIENT_ID || process.env.HUBTEL_CLIENT_ID) &&
      (process.env.HUBTEL_OTP_CLIENT_SECRET || process.env.HUBTEL_SMS_CLIENT_SECRET || process.env.HUBTEL_CLIENT_SECRET) &&
      process.env.HUBTEL_OTP_SEND_URL &&
      process.env.HUBTEL_OTP_VERIFY_URL,
    ),
    payments: Boolean(
      (process.env.HUBTEL_PAYMENT_CLIENT_ID || process.env.HUBTEL_CLIENT_ID) &&
      (process.env.HUBTEL_PAYMENT_CLIENT_SECRET || process.env.HUBTEL_CLIENT_SECRET) &&
      process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER &&
      process.env.HUBTEL_CHECKOUT_INITIATE_URL &&
      process.env.HUBTEL_TRANSACTION_STATUS_URL,
    ),
    senderId: process.env.HUBTEL_SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID || '',
    merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '',
  };
}

export async function sendHubtelSms(input: {
  to: string;
  content: string;
  senderId?: string;
}): Promise<HubtelSmsResult> {
  const auth = credentials('SMS');
  const senderId = (input.senderId || process.env.HUBTEL_SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID || '').trim();
  if (!senderId || senderId.length > 11) {
    throw new Error('Hubtel SMS sender ID is not configured or exceeds 11 characters');
  }
  const to = normalizePhone(input.to);
  const content = input.content.trim();
  if (!content) throw new Error('SMS content is required');

  const endpoint = process.env.HUBTEL_SMS_URL || 'https://smsc.hubtel.com/v1/messages/send';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(auth),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ from: senderId, to, content }),
    cache: 'no-store',
  });
  const raw = await readJson(response);
  if (!response.ok) throw new Error(providerError(raw, 'Hubtel SMS request failed'));

  const data = dataObject(raw);
  return {
    ok: true,
    providerMessageId: String(data.messageId || data.MessageId || ''),
    networkId: String(data.networkId || data.NetworkId || ''),
    rate: Number.isFinite(Number(data.rate)) ? Number(data.rate) : null,
    status: String(data.status || raw.status || 'accepted'),
    raw,
  };
}

export async function sendHubtelOtp(input: {
  phoneNumber: string;
  countryCode?: string;
  senderId?: string;
}): Promise<{ requestId: string; prefix: string; raw: JsonRecord }> {
  const auth = credentials('OTP');
  const endpoint = process.env.HUBTEL_OTP_SEND_URL;
  if (!endpoint) throw new Error('Hubtel OTP send endpoint is not configured');
  const senderId = (input.senderId || process.env.HUBTEL_SMS_SENDER_ID || process.env.HUBTEL_SENDER_ID || '').trim();
  if (!senderId) throw new Error('Hubtel sender ID is not configured');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(auth),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      senderId,
      phoneNumber: normalizePhone(input.phoneNumber),
      countryCode: (input.countryCode || 'GH').toUpperCase(),
    }),
    cache: 'no-store',
  });
  const raw = await readJson(response);
  if (!response.ok) throw new Error(providerError(raw, 'Hubtel OTP request failed'));
  const data = dataObject(raw);
  const requestId = String(data.requestId || data.RequestId || '');
  const prefix = String(data.prefix || data.Prefix || '');
  if (!requestId) throw new Error('Hubtel OTP response did not include a request ID');
  return { requestId, prefix, raw };
}

export async function verifyHubtelOtp(input: {
  requestId: string;
  prefix: string;
  code: string;
}): Promise<{ verified: boolean; raw: JsonRecord }> {
  const auth = credentials('OTP');
  const endpoint = process.env.HUBTEL_OTP_VERIFY_URL;
  if (!endpoint) throw new Error('Hubtel OTP verify endpoint is not configured');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(auth),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      requestId: input.requestId,
      prefix: input.prefix,
      code: input.code,
    }),
    cache: 'no-store',
  });
  const raw = await readJson(response);
  if (!response.ok) throw new Error(providerError(raw, 'Hubtel OTP verification failed'));
  const responseCode = String(raw.responseCode || raw.code || '');
  const status = String(raw.status || raw.message || '').toLowerCase();
  return {
    verified: ['0000', '0', '200'].includes(responseCode) || status.includes('success') || status.includes('verified'),
    raw,
  };
}

export async function initiateHubtelCheckout(input: {
  totalAmount: number;
  description: string;
  clientReference: string;
  callbackUrl: string;
  returnUrl: string;
  cancellationUrl: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}): Promise<HubtelCheckoutResult> {
  const auth = credentials('PAYMENT');
  const endpoint = process.env.HUBTEL_CHECKOUT_INITIATE_URL;
  const merchantAccountNumber = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER;
  if (!endpoint || !merchantAccountNumber) {
    throw new Error('Hubtel Online Checkout is not configured');
  }

  const payload: Record<string, unknown> = {
    totalAmount: Number(input.totalAmount.toFixed(2)),
    description: input.description,
    callbackUrl: input.callbackUrl,
    returnUrl: input.returnUrl,
    cancellationUrl: input.cancellationUrl,
    merchantAccountNumber,
    clientReference: input.clientReference,
  };
  if (input.payerName) payload.payeeName = input.payerName;
  if (input.payerEmail) payload.payeeEmail = input.payerEmail;
  if (input.payerPhone) payload.payeeMobileNumber = normalizePhone(input.payerPhone);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(auth),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const raw = await readJson(response);
  if (!response.ok) throw new Error(providerError(raw, 'Hubtel checkout request failed'));
  const data = dataObject(raw);
  const checkoutUrl = String(data.checkoutUrl || data.CheckoutUrl || '');
  const checkoutDirectUrl = String(data.checkoutDirectUrl || data.CheckoutDirectUrl || '');
  const checkoutId = String(data.checkoutId || data.CheckoutId || '');
  const clientReference = String(data.clientReference || data.ClientReference || input.clientReference);
  if (!checkoutUrl && !checkoutDirectUrl) {
    throw new Error('Hubtel checkout response did not include a payment URL');
  }
  return { checkoutUrl, checkoutDirectUrl, checkoutId, clientReference, raw };
}

export async function checkHubtelPaymentStatus(input: {
  clientReference: string;
  hubtelTransactionId?: string;
}): Promise<HubtelPaymentStatus> {
  const auth = credentials('PAYMENT');
  const configured = process.env.HUBTEL_TRANSACTION_STATUS_URL;
  const merchantAccountNumber = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER;
  if (!configured || !merchantAccountNumber) {
    throw new Error('Hubtel transaction status endpoint is not configured');
  }

  const endpoint = configured.replaceAll('{merchantAccountNumber}', encodeURIComponent(merchantAccountNumber));
  const url = new URL(endpoint);
  url.searchParams.set('clientReference', input.clientReference);
  if (input.hubtelTransactionId) url.searchParams.set('hubtelTransactionId', input.hubtelTransactionId);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: basicAuth(auth),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const raw = await readJson(response);
  if (!response.ok) throw new Error(providerError(raw, 'Hubtel transaction status check failed'));
  const data = dataObject(raw);
  const status = String(data.status || data.Status || raw.status || '').trim();
  return {
    paid: status.toLowerCase() === 'paid',
    status: status || 'Unknown',
    transactionId: String(data.transactionId || data.TransactionId || ''),
    externalTransactionId: String(data.externalTransactionId || data.ExternalTransactionId || ''),
    paymentMethod: String(data.paymentMethod || data.PaymentMethod || ''),
    clientReference: String(data.clientReference || data.ClientReference || input.clientReference),
    currencyCode: String(data.currencyCode || data.CurrencyCode || 'GHS').toUpperCase(),
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : null,
    charges: Number.isFinite(Number(data.charges)) ? Number(data.charges) : null,
    amountAfterCharges: Number.isFinite(Number(data.amountAfterCharges)) ? Number(data.amountAfterCharges) : null,
    date: String(data.date || data.Date || ''),
    raw,
  };
}
