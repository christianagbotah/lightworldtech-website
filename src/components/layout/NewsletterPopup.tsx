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
  const [showConfetti, setShowConfetti] = useState(false);
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
      setShowConfetti(true);
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
                {/* Decorative gradient orbs in background */}
                <div className="absolute top-2 right-2 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-300/10 rounded-full blur-3xl" />

                {/* Mesh pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }} />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
                  aria-label="Close popup"
                >
                  <X className="size-4" />
                </button>

                {/* Illustration icon */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/10">
                    <Bell className="size-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Stay Updated</h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 -mt-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                  {/* Subtle mesh pattern on content area */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                    backgroundImage: `
                      radial-gradient(circle, #059669 1px, transparent 1px)
                    `,
                    backgroundSize: '16px 16px',
                  }} />

                  {!success ? (
                    <div className="relative z-10">
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
                            className="pl-10 h-11 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 focus:border-transparent focus:ring-2 focus:ring-emerald-500/40 focus-visible:ring-emerald-500/40 transition-all duration-300"
                            disabled={loading}
                            autoFocus
                          />
                          {/* Gradient border on focus - implemented via ring */}
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow duration-300"
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
                    </div>
                  ) : (
                    <div className="text-center py-4 relative z-10">
                      {/* Confetti dots animation */}
                      {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {Array.from({ length: 20 }).map((_, i) => {
                            const dot = {
                              id: i,
                              x: (i * 137.5 + 50) % 300 - 150,
                              y: -((i * 73.1 + 30) % 150 + 50),
                              rotation: (i * 47) % 360,
                              color: i % 3 === 0 ? '#059669' : i % 3 === 1 ? '#d97706' : '#10b981',
                              size: (i * 3) % 4 + 4,
                              delay: (i * 0.015),
                            };
                            return (
                              <motion.div
                                key={dot.id}
                                className="absolute rounded-full"
                                style={{
                                  left: '50%',
                                  top: '40%',
                                  width: dot.size,
                                  height: dot.size,
                                  backgroundColor: dot.color,
                                }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                animate={{
                                  x: dot.x,
                                  y: dot.y,
                                  opacity: 0,
                                  scale: 1,
                                  rotate: dot.rotation,
                                }}
                                transition={{
                                  duration: 1,
                                  delay: dot.delay,
                                  ease: 'easeOut',
                                }}
                              />
                            );
                          })}
                        </div>
                      )}

                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                      >
                        <div className="size-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                          <CheckCircle className="size-7 text-white" />
                        </div>
                      </motion.div>
                      <motion.h4
                        className="text-lg font-semibold text-slate-900 dark:text-white mb-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        You&apos;re all set!
                      </motion.h4>
                      <motion.p
                        className="text-sm text-slate-600 dark:text-slate-300 mb-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Thank you for subscribing. We&apos;ll send you our latest updates and insights.
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button
                          onClick={handleClose}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                        >
                          Continue Browsing
                        </Button>
                      </motion.div>
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
