import { NextResponse } from 'next/server';
import { companyProfile } from '@/lib/company-profile';

export const dynamic = 'force-dynamic';

export function GET() {
  const response = NextResponse.redirect(companyProfile.googleReviewUrl, 307);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return response;
}
