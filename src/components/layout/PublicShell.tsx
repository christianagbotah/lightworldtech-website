import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import CookieConsent from '@/components/layout/CookieConsent';
import ScrollProgress from '@/components/ui/scroll-progress';
import CommandPalette from '@/components/ui/command-palette';

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Header />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <FloatingWidgets />
      <CookieConsent />
      <CommandPalette />
    </div>
  );
}
