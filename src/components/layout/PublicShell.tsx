import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import CookieConsent from '@/components/layout/CookieConsent';
import ScrollProgress from '@/components/ui/scroll-progress';
import CommandPalette from '@/components/ui/command-palette';
import { getSiteSettings } from '@/lib/site-content-server';

export default async function PublicShell({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Header settings={settings} />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={settings} />
      <FloatingWidgets />
      <CookieConsent />
      <CommandPalette />
    </div>
  );
}
