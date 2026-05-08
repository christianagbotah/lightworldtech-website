'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'lw-cookie-consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setShow(false);
  };

  return (
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6">
              {/* Icon */}
              <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Cookie className="size-5 text-amber-600 dark:text-amber-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">We value your privacy</h3>
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
                  <button className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    Read our Cookie Policy
                  </button>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decline}
                  className="text-xs border-slate-300 dark:border-slate-600 h-8"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={accept}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                >
                  Accept All
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
