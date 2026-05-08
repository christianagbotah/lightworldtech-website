'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Bell, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const POPUP_DELAY_MS = 15000;
const SESSION_KEY = 'lw-newsletter-popup-shown';
const DISMISS_KEY = 'lw-newsletter-popup-dismissed';

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if user has permanently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    // Check if already shown this session
    const shown = sessionStorage.getItem(SESSION_KEY);
    if (shown) return;

    // Set timer to show popup
    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsOpen(true);
    }, POPUP_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setIsOpen(false);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSuccess(true);
      toast.success('Successfully subscribed!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[71] p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Gradient Header */}
              <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-amber-500 p-8 pb-12">
                {/* Decorative circles */}
                <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-2 left-8 w-16 h-16 bg-amber-400/20 rounded-full blur-xl" />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors z-10"
                  aria-label="Close popup"
                >
                  <X className="size-4" />
                </button>

                {/* Illustration icon */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                    <Bell className="size-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Stay Updated</h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 -mt-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                  {!success ? (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-300 text-center mb-5 leading-relaxed">
                        Get the latest tech insights, industry trends, and exclusive offers delivered straight to your inbox. Join 500+ subscribers!
                      </p>

                      <form onSubmit={handleSubscribe} className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="pl-10 h-11 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 focus:border-emerald-500"
                            disabled={loading}
                            autoFocus
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Subscribing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              Subscribe Now
                              <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </form>

                      <button
                        onClick={handleDontShowAgain}
                        className="block mx-auto mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        Don&apos;t show this again
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="size-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        You&apos;re all set!
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                        Thank you for subscribing. We&apos;ll send you our latest updates and insights.
                      </p>
                      <Button
                        onClick={handleClose}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Continue Browsing
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
