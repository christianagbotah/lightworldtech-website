'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { contentText, type SiteSettings } from '@/lib/site-content';
import {
  acceptedCurrentCookiePreferences,
  defaultCookiePreferences,
  normalizeCookiePreferences,
  parseCookiePreferences,
  type CookiePreferences,
} from '@/lib/cookie-consent';

const STORAGE_KEY = 'lw-cookie-consent';
const PREFERENCES_KEY = 'lw-cookie-preferences';

type VisiblePreferenceKey = 'essential' | 'analytics';

function loadSavedPrefs(): CookiePreferences {
  if (typeof window === 'undefined') return { ...defaultCookiePreferences };
  return parseCookiePreferences(localStorage.getItem(PREFERENCES_KEY));
}

export default function CookieConsent({ settings = {} }: { settings?: SiteSettings }) {
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaultCookiePreferences);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);

  const title = contentText(settings, 'cookie_consent_title', 'We value your privacy');
  const description = contentText(
    settings,
    'cookie_consent_description',
    'We use essential browser storage to operate the site. Optional analytics helps us understand consented website usage; optional categories stay off unless you choose them.',
  );
  const privacyLinkLabel = contentText(settings, 'cookie_privacy_link_label', 'Privacy & Cookie Notice');
  const customizeLabel = contentText(settings, 'cookie_customize_label', 'Customize');
  const declineLabel = contentText(settings, 'cookie_decline_label', 'Decline optional');
  const acceptLabel = contentText(settings, 'cookie_accept_label', 'Accept analytics');
  const categoriesTitle = contentText(settings, 'cookie_categories_title', 'Cookie categories');
  const alwaysOnLabel = contentText(settings, 'cookie_always_on_label', 'Always on');
  const saveLabel = contentText(settings, 'cookie_save_label', 'Save preferences');
  const settingsLabel = contentText(settings, 'cookie_settings_label', 'Cookie settings');

  const categories: Array<{
    key: VisiblePreferenceKey;
    name: string;
    description: string;
    locked: boolean;
  }> = [
    {
      key: 'essential',
      name: contentText(settings, 'cookie_essential_name', 'Essential'),
      description: contentText(
        settings,
        'cookie_essential_description',
        'Required for the website to function properly. Cannot be disabled.',
      ),
      locked: true,
    },
    {
      key: 'analytics',
      name: contentText(settings, 'cookie_analytics_name', 'Analytics'),
      description: contentText(
        settings,
        'cookie_analytics_description',
        'Optional first-party analytics that helps us understand which pages and journeys are useful.',
      ),
      locked: false,
    },
  ];

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (consent) {
      const saved = loadSavedPrefs();
      const timer = setTimeout(() => {
        setShowSettingsBtn(true);
        setPrefs(saved);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const savePreferences = (preferences: CookiePreferences) => {
    const normalized = normalizeCookiePreferences(preferences);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalized));
    setPrefs(normalized);
    window.dispatchEvent(new Event('lw-consent-changed'));
  };

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    savePreferences(acceptedCurrentCookiePreferences);
    setShow(false);
    setShowCustomize(false);
    setShowSettingsBtn(true);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    savePreferences(defaultCookiePreferences);
    setShow(false);
    setShowCustomize(false);
    setShowSettingsBtn(true);
  };

  const acceptCustomized = () => {
    localStorage.setItem(STORAGE_KEY, 'customized');
    savePreferences(prefs);
    setShow(false);
    setShowCustomize(false);
    setShowSettingsBtn(true);
  };

  const togglePref = (key: VisiblePreferenceKey) => {
    if (key === 'essential') return;
    setPrefs((current) =>
      normalizeCookiePreferences({
        ...current,
        [key]: !current[key],
      }),
    );
  };

  const openSettings = () => {
    setPrefs(loadSavedPrefs());
    setShow(true);
    setShowCustomize(true);
  };

  return (
    <>
      {showSettingsBtn && !show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-24 left-4 z-50 flex size-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 shadow-lg transition-colors hover:text-amber-400 hover:shadow-xl dark:bg-slate-700 sm:left-6 lg:bottom-6"
          onClick={openSettings}
          aria-label={settingsLabel}
          title={settingsLabel}
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
            className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-6"
          >
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col items-start gap-4 p-4 sm:p-6 lg:flex-row lg:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Cookie className="size-5 text-emerald-600 dark:text-amber-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <ShieldCheck className="size-3.5 text-amber-500" />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}{' '}
                    <Link
                      href="/privacy"
                      className="font-medium text-emerald-600 hover:underline dark:text-amber-400"
                    >
                      {privacyLinkLabel}
                    </Link>
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomize((current) => !current)}
                    className="h-8 gap-1 border-slate-300 text-xs dark:border-slate-600"
                  >
                    <Settings className="size-3" />
                    {customizeLabel}
                    {showCustomize ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decline}
                    className="h-8 border-slate-300 text-xs dark:border-slate-600"
                  >
                    {declineLabel}
                  </Button>
                  <Button
                    size="sm"
                    onClick={accept}
                    className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    {acceptLabel}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decline}
                    className="hidden size-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 sm:flex"
                  >
                    <X className="size-4" />
                    <span className="sr-only">{declineLabel}</span>
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-4 dark:border-slate-700 sm:px-6 sm:pb-6">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {categoriesTitle}
                      </p>
                      {categories.map((category) => (
                        <div
                          key={category.key}
                          className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{category.name}</span>
                              {category.locked && (
                                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-600 dark:text-slate-400">
                                  {alwaysOnLabel}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {category.description}
                            </p>
                          </div>
                          <Switch
                            checked={prefs[category.key]}
                            disabled={category.locked}
                            onCheckedChange={() => togglePref(category.key)}
                            className="data-[state=checked]:bg-emerald-600"
                            aria-label={category.name}
                          />
                        </div>
                      ))}
                      <div className="flex justify-end pt-2">
                        <Button
                          size="sm"
                          onClick={acceptCustomized}
                          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        >
                          {saveLabel}
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
