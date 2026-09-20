'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { contentText, type SiteSettings } from '@/lib/site-content';

const STORAGE_KEY = 'lw-cookie-consent';
const PREFERENCES_KEY = 'lw-cookie-preferences';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

function loadSavedPrefs(): CookiePreferences {
  if (typeof window === 'undefined') return defaultPreferences;
  const saved = localStorage.getItem(PREFERENCES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return defaultPreferences;
}

export default function CookieConsent({ settings = {} }: { settings?: SiteSettings }) {
  const categories = [
    {
      key: 'essential' as const,
      name: contentText(settings, 'cookie_essential_name', 'Essential'),
      description: contentText(settings, 'cookie_essential_description', 'Required for the website to function properly. Cannot be disabled.'),
      locked: true,
    },
    {
      key: 'analytics' as const,
      name: contentText(settings, 'cookie_analytics_name', 'Analytics'),
      description: contentText(settings, 'cookie_analytics_description', 'Help us understand how visitors interact with our website.'),
      locked: false,
    },
    {
      key: 'marketing' as const,
      name: contentText(settings, 'cookie_marketing_name', 'Marketing'),
      description: contentText(settings, 'cookie_marketing_description', 'Reserved for optional marketing integrations. Not required for first-party website analytics.'),
      locked: false,
    },
    {
      key: 'preferences' as const,
      name: contentText(settings, 'cookie_preferences_name', 'Preferences'),
      description: contentText(settings, 'cookie_preferences_description', 'Allow the website to remember choices you make, such as theme or language.'),
      locked: false,
    },
  ];

  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaultPreferences);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (consent) {
      const saved = loadSavedPrefs();
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setShowSettingsBtn(true);
        setPrefs(saved);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (preferences: CookiePreferences) => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    window.dispatchEvent(new Event('lw-consent-changed'));
  };

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    savePreferences(allAccepted);
    setShow(false);
    setShowSettingsBtn(true);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    const allDeclined: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    savePreferences(allDeclined);
    setShow(false);
    setShowSettingsBtn(true);
  };

  const acceptCustomized = () => {
    localStorage.setItem(STORAGE_KEY, 'customized');
    savePreferences(prefs);
    setShow(false);
    setShowCustomize(false);
    setShowSettingsBtn(true);
  };

  const togglePref = (key: keyof CookiePreferences) => {
    if (key === 'essential') return;
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSettings = () => {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      try {
        setPrefs(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setShow(true);
    setShowCustomize(true);
  };

  return (
    <>
      {/* Cookie Settings button (shown in footer area) */}
      {showSettingsBtn && !show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 left-6 z-50 size-10 rounded-full bg-slate-800 dark:bg-slate-700 text-slate-400 hover:text-amber-400 shadow-lg hover:shadow-xl flex items-center justify-center transition-colors"
          onClick={openSettings}
          aria-label="Cookie Settings"
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
            className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6"
          >
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Main consent bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
                {/* Icon */}
                <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Cookie className="size-5 text-emerald-600 dark:text-amber-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{contentText(settings, 'cookie_banner_title', 'We value your privacy')}</h3>
                    <ShieldCheck className="size-3.5 text-amber-500" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {contentText(
                      settings,
                      'cookie_banner_description',
                      'We use essential browser storage to operate the site. Optional analytics helps us understand consented website usage; optional categories stay off unless you choose them.',
                    )}{' '}
                    <Link href="/privacy" className="text-emerald-600 dark:text-amber-400 hover:underline font-medium">
                      {contentText(settings, 'cookie_privacy_link_label', 'Privacy & Cookie Notice')}
                    </Link>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomize(!showCustomize)}
                    className="text-xs border-slate-300 dark:border-slate-600 h-8 gap-1"
                  >
                    <Settings className="size-3" />
                    {contentText(settings, 'cookie_customize_label', 'Customize')}
                    {showCustomize ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decline}
                    className="text-xs border-slate-300 dark:border-slate-600 h-8"
                  >
                    {contentText(settings, 'cookie_decline_label', 'Decline')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={accept}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                  >
                    {contentText(settings, 'cookie_accept_all_label', 'Accept All')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decline}
                    className="size-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hidden sm:flex"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              </div>

              {/* Customize dropdown */}
              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {contentText(settings, 'cookie_categories_title', 'Cookie Categories')}
                      </p>
                      {categories.map((cat) => (
                        <div
                          key={cat.key}
                          className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{cat.name}</span>
                              {cat.locked && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 font-medium">
                                  {contentText(settings, 'cookie_always_on_label', 'Always on')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                          </div>
                          <Switch
                            checked={prefs[cat.key]}
                            disabled={cat.locked}
                            onCheckedChange={() => togglePref(cat.key)}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                      ))}
                      <div className="flex justify-end pt-2">
                        <Button
                          size="sm"
                          onClick={acceptCustomized}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {contentText(settings, 'cookie_save_preferences_label', 'Save Preferences')}
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
