'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Cookie, Settings, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'lw-cookie-consent';
const PREFERENCES_KEY = 'lw-cookie-preferences';

interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: false;
  preferences: false;
}

const essentialOnly: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

function normalizePreferences(value: unknown): CookiePreferences {
  if (!value || typeof value !== 'object') return essentialOnly;
  const saved = value as Record<string, unknown>;
  return {
    essential: true,
    analytics: saved.analytics === true,
    marketing: false,
    preferences: false,
  };
}

function loadSavedPrefs(): CookiePreferences {
  if (typeof window === 'undefined') return essentialOnly;
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    return saved ? normalizePreferences(JSON.parse(saved)) : essentialOnly;
  } catch {
    return essentialOnly;
  }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(essentialOnly);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    const timer = setTimeout(() => {
      if (consent) {
        setPrefs(loadSavedPrefs());
        setShowSettingsBtn(true);
      } else {
        setPrefs(essentialOnly);
        setShow(true);
      }
    }, consent ? 0 : 1200);

    return () => clearTimeout(timer);
  }, []);

  const savePreferences = (preferences: CookiePreferences, status: string) => {
    localStorage.setItem(STORAGE_KEY, status);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setPrefs(preferences);
    setShow(false);
    setShowCustomize(false);
    setShowSettingsBtn(true);
    window.dispatchEvent(new Event('lw-consent-changed'));
  };

  const allowAnalytics = () => {
    savePreferences({ ...essentialOnly, analytics: true }, 'analytics-allowed');
  };

  const essentialOnlyChoice = () => {
    savePreferences(essentialOnly, 'essential-only');
  };

  const saveCustomized = () => {
    savePreferences({ ...essentialOnly, analytics: prefs.analytics }, 'customized');
  };

  const openSettings = () => {
    setPrefs(loadSavedPrefs());
    setShowCustomize(true);
    setShow(true);
  };

  return (
    <>
      {showSettingsBtn && !show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 left-6 z-50 flex size-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 shadow-lg transition-colors hover:text-amber-400 hover:shadow-xl dark:bg-slate-700"
          onClick={openSettings}
          aria-label="Privacy and analytics settings"
          title="Privacy settings"
        >
          <Cookie className="size-4" />
        </motion.button>
      )}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[80] p-4 sm:p-6"
          >
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col items-start gap-4 p-4 sm:p-6 lg:flex-row lg:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="size-5 text-emerald-700 dark:text-emerald-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Your privacy choices</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    We use essential browser storage for site operation. With your permission, Lightworld also uses
                    privacy-conscious first-party analytics to understand aggregate website use. Analytics is off
                    until you allow it, and the tracker respects a browser Do Not Track signal.{' '}
                    <Link
                      href="/cookies"
                      className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      Read our Cookie & Browser Storage Policy
                    </Link>
                    .
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomize((current) => !current)}
                    className="h-9 gap-1 text-xs"
                  >
                    <Settings className="size-3" />
                    Manage
                    {showCustomize ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={essentialOnlyChoice}
                    className="h-9 text-xs"
                  >
                    Essential only
                  </Button>
                  <Button
                    size="sm"
                    onClick={allowAnalytics}
                    className="h-9 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    Allow analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={essentialOnlyChoice}
                    className="hidden size-9 text-slate-400 hover:text-slate-600 sm:flex dark:hover:text-slate-300"
                    aria-label="Close and use essential storage only"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-4 dark:border-slate-700 sm:px-6 sm:pb-6">
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/45">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">Essential</span>
                            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-600 dark:text-slate-300">
                              Always on
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Supports security, consent records and requested website functions.
                          </p>
                        </div>
                        <Switch checked disabled aria-label="Essential storage enabled" />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/45">
                        <div>
                          <span className="text-sm font-medium text-foreground">First-party analytics</span>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Counts anonymous sessions, page views and selected engagement events. The analytics
                            event table is designed without raw IP, email or browser-fingerprint fields.
                          </p>
                        </div>
                        <Switch
                          checked={prefs.analytics}
                          onCheckedChange={(checked) =>
                            setPrefs({ ...essentialOnly, analytics: checked })
                          }
                          aria-label="Allow first-party analytics"
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>

                      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-2xl text-[11px] leading-5 text-slate-400 dark:text-slate-500">
                          No advertising or cross-site marketing tracker is currently activated by the Lightworld
                          Next.js website.
                        </p>
                        <Button
                          size="sm"
                          onClick={saveCustomized}
                          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        >
                          Save choices
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
