'use client';

export type AnalyticsEventName =
  | 'session_start'
  | 'page_view'
  | 'assistant_open'
  | 'assistant_message'
  | 'assistant_project_scope'
  | 'assistant_feedback'
  | 'whatsapp_open'
  | 'contact_submit'
  | 'newsletter_subscribe'
  | 'cta_click';

const SESSION_KEY = 'lw-analytics-session';
const CONSENT_KEY = 'lw-cookie-preferences';
const SESSION_STARTED_KEY = 'lw-analytics-session-started';

type SafeMetadata = Record<string, string | number | boolean>;

function analyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (navigator.doNotTrack === '1') return false;

  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const prefs = JSON.parse(raw) as { analytics?: boolean };
    return prefs.analytics === true;
  } catch {
    return false;
  }
}

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (id) return id;

  id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'lw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);

  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function referrerDomain(): string {
  try {
    if (!document.referrer) return '';
    return new URL(document.referrer).hostname.slice(0, 160);
  } catch {
    return '';
  }
}

export function trackEvent(
  event: AnalyticsEventName,
  options: { path?: string; metadata?: SafeMetadata } = {},
): void {
  if (!analyticsAllowed()) return;

  const sessionId = getSessionId();
  const path = (options.path || window.location.pathname || '/').slice(0, 240);
  const payload = JSON.stringify({
    sessionId,
    event,
    path,
    referrer: referrerDomain(),
    metadata: options.metadata || {},
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      '/api/analytics',
      new Blob([payload], { type: 'application/json' }),
    );
    if (sent) return;
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt the visitor experience.
  });
}

export function ensureSessionStarted(path?: string): void {
  if (!analyticsAllowed()) return;
  if (sessionStorage.getItem(SESSION_STARTED_KEY)) return;
  sessionStorage.setItem(SESSION_STARTED_KEY, '1');
  trackEvent('session_start', { path });
}

export function isAnalyticsAllowed(): boolean {
  return analyticsAllowed();
}
