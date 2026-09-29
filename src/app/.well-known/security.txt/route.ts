import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);

  const body = [
    'Contact: mailto:mail@lightworldtech.com',
    'Expires: ' + expires.toISOString(),
    'Preferred-Languages: en',
    'Canonical: https://lightworldtech.com/.well-known/security.txt',
    'Policy: https://lightworldtech.com/security',
    '',
  ].join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
