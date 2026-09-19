import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyNewsletterUnsubscribeToken } from '@/lib/newsletter-unsubscribe';

export const runtime = 'nodejs';

function wantsRedirect(request: NextRequest) {
  return new URL(request.url).searchParams.get('redirect') === '1';
}

function redirectResult(request: NextRequest, status: 'success' | 'invalid') {
  const url = new URL('/newsletter/unsubscribe', request.url);
  url.searchParams.set('status', status);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token') || undefined;
  const subscriberId = verifyNewsletterUnsubscribeToken(token);

  if (!subscriberId) {
    if (wantsRedirect(request)) return redirectResult(request, 'invalid');
    return NextResponse.json({ success: false, error: 'Invalid unsubscribe link' }, { status: 400 });
  }

  try {
    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { id: subscriberId },
      select: { id: true, active: true },
    });

    if (subscriber?.active) {
      await db.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { active: false },
      });
    }

    if (wantsRedirect(request)) return redirectResult(request, 'success');
    return NextResponse.json({
      success: true,
      message: 'This address has been unsubscribed from Lightworld Technologies updates.',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe failed:', error);
    if (wantsRedirect(request)) {
      const url = new URL('/newsletter/unsubscribe', request.url);
      url.searchParams.set('status', 'error');
      return NextResponse.redirect(url, { status: 303 });
    }
    return NextResponse.json({ success: false, error: 'Unable to update subscription' }, { status: 500 });
  }
}
