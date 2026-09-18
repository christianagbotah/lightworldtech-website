import type { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __lwPublicRateLimits: Map<string, Bucket> | undefined;
}

const buckets = globalThis.__lwPublicRateLimits ?? new Map<string, Bucket>();
globalThis.__lwPublicRateLimits = buckets;

function clientKey(request: NextRequest): string {
  const cloudflare = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflare) return cloudflare.slice(0, 80);

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.slice(0, 80);

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
