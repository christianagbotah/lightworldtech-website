'use client';

import { Download, Share2, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'lw-pwa-install-dismissed-at';
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 12_000;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? Number(raw) : 0;
    return Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private browsing/storage restrictions should never break the public website.
  }
}

export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    if ('serviceWorker' in navigator) {
      const register = () => {
        void navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch((error) => {
            console.warn('Lightworld service worker registration failed', error);
          });
      };

      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register, { once: true });
      }

      return () => window.removeEventListener('load', register);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || isStandalone() || recentlyDismissed()) return;

    let timer: number | null = null;

    const revealWhenUseful = () => {
      if (!window.matchMedia('(max-width: 1024px)').matches && !ios) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      revealWhenUseful();
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      setShowIosHelp(false);
      try {
        window.localStorage.removeItem(DISMISS_KEY);
      } catch {
        // Storage is optional for install UX.
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (ios) revealWhenUseful();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [ios]);

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt['prompt']();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setVisible(false);
        return;
      }
      rememberDismissal();
      setVisible(false);
      return;
    }

    if (ios) setShowIosHelp(true);
  };

  if (!visible || isStandalone() || (!deferredPrompt && !ios)) return null;

  return (
    <aside
      role="dialog"
      aria-label="Install Lightworld website"
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-[85] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-amber-400/15 dark:bg-slate-950/95 sm:left-auto sm:right-5"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
        aria-label="Dismiss install suggestion"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-300 shadow-sm dark:bg-white dark:text-slate-950">
          <Smartphone className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">Keep Lightworld on your home screen</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">
            Open the website like an app, with a standalone interface and faster access to public pages you have visited.
          </p>
        </div>
      </div>

      {showIosHelp ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white/55">
          <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
            <Share2 className="size-4 text-amber-500" />
            Add on iPhone or iPad
          </p>
          <p className="mt-1.5">Open your browser&apos;s Share menu, choose <strong>Add to Home Screen</strong>, then confirm Add.</p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
        >
          {ios && !deferredPrompt ? <Share2 className="size-4" /> : <Download className="size-4" />}
          {ios && !deferredPrompt ? 'Show install steps' : 'Install Lightworld'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition hover:border-amber-300 hover:text-slate-800 dark:border-white/[0.08] dark:text-white/45 dark:hover:text-white"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
