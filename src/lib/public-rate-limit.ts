import type { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __lwPublicRateLimits: Map<string, Bucket> | undefined;
}

const buckets = globalThis.__lwPublicRateLimits ?? new Map<string, Bucket>();
globalThis.__lwPublicRateLimits = buckets;

function boundedHeader(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 80) : null;
}

function clientKey(request: NextRequest): string {
  // Production Nginx overwrites X-Real-IP with $remote_addr before proxying
  // to this loopback-only Next.js service. Prefer that trusted boundary over
  // caller-controlled forwarding headers.
  const realIp = boundedHeader(request.headers.get('x-real-ip'));
  if (realIp) return realIp;

  // Useful for local/test environments without the production reverse proxy.
  // Use the right-most forwarded address because prepended values can be
  // supplied by the original caller.
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  if (forwarded) return forwarded.slice(0, 80);

  // CF-Connecting-IP is trusted only when explicitly enabled for a deployment
  // that verifies requests are arriving through Cloudflare.
  if (process.env.TRUST_CF_CONNECTING_IP === 'true') {
    const cloudflare = boundedHeader(request.headers.get('cf-connecting-ip'));
    if (cloudflare) return cloudflare;
  }

  return 'unknown';
}

export function consumePublicRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const key = namespace + ':' + clientKey(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
