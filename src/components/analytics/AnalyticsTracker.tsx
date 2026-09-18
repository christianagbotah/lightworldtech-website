'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ensureSessionStarted, isAnalyticsAllowed, trackEvent } from '@/lib/analytics-client';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const trackCurrentPage = () => {
      if (!isAnalyticsAllowed()) return;
      ensureSessionStarted(pathname);
      if (lastTrackedPath.current === pathname) return;
      lastTrackedPath.current = pathname;
      trackEvent('page_view', { path: pathname });
    };

    trackCurrentPage();
    window.addEventListener('lw-consent-changed', trackCurrentPage);

    return () => {
      window.removeEventListener('lw-consent-changed', trackCurrentPage);
    };
  }, [pathname]);

  return null;
}
