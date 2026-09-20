import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import CookieConsent from '@/components/layout/CookieConsent';
import ScrollProgress from '@/components/ui/scroll-progress';
import CommandPalette from '@/components/ui/command-palette';
import { getSiteSettings } from '@/lib/site-content-server';
import type { SiteSettings } from '@/lib/site-content';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';

export default async function PublicShell({
  children,
  settings,
}: {
  children: ReactNode;
  settings?: SiteSettings;
}) {
  const resolvedSettings = settings ?? await getSiteSettings();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnalyticsTracker />
      <ScrollProgress />
      <Header settings={resolvedSettings} />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={resolvedSettings} />
      <FloatingWidgets />
      <CookieConsent />
      <CommandPalette />
    </div>
  );
}
