import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedDays = Number(new URL(request.url).searchParams.get('days') || '30');
  const days = Number.isFinite(requestedDays)
    ? Math.min(90, Math.max(7, Math.floor(requestedDays)))
    : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const events = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: {
        sessionId: true,
        event: true,
        path: true,
        referrer: true,
        createdAt: true,
      },
    });

    const sessions = new Set(events.map((event) => event.sessionId));
    const pageViews = events.filter((event) => event.event === 'page_view');
    const assistantMessages = events.filter((event) => event.event === 'assistant_message');
    const projectScopes = events.filter((event) => event.event === 'assistant_project_scope');
    const contactSubmits = events.filter((event) => event.event === 'contact_submit');

    const pageCounts = new Map<string, number>();
    for (const event of pageViews) {
      pageCounts.set(event.path, (pageCounts.get(event.path) || 0) + 1);
    }

    const referrerCounts = new Map<string, number>();
    for (const event of events) {
      if (!event.referrer) continue;
      referrerCounts.set(event.referrer, (referrerCounts.get(event.referrer) || 0) + 1);
    }

    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (days - 1 - index));
      return {
        date: dayKey(date),
        pageViews: 0,
        sessions: 0,
        assistantMessages: 0,
        leads: 0,
        _sessions: new Set<string>(),
      };
    });

    const dailyByDate = new Map(daily.map((item) => [item.date, item]));
    for (const event of events) {
      const row = dailyByDate.get(dayKey(event.createdAt));
      if (!row) continue;
      row._sessions.add(event.sessionId);
      if (event.event === 'page_view') row.pageViews += 1;
      if (event.event === 'assistant_message') row.assistantMessages += 1;
      if (event.event === 'contact_submit') row.leads += 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        days,
        uniqueSessions: sessions.size,
        pageViews: pageViews.length,
        assistantMessages: assistantMessages.length,
        projectScopes: projectScopes.length,
        contactSubmits: contactSubmits.length,
        topPages: [...pageCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([path, views]) => ({ path, views })),
        topReferrers: [...referrerCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([referrer, events]) => ({ referrer, events })),
        daily: daily.map(({ _sessions, ...item }) => ({
          ...item,
          sessions: _sessions.size,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching first-party analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
