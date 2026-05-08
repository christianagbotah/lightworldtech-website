'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

function usePreloaderState() {
  const initialized = useRef(false);
  // Always start visible to match server render (no hydration mismatch)
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  const hide = useCallback(() => {
    setVisible(false);
    try { sessionStorage.setItem('lw-preloader-shown', 'true'); } catch {}
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Check if preloader was already shown this session
    const alreadyShown = sessionStorage.getItem('lw-preloader-shown');
    if (alreadyShown) {
      // Defer the setState to avoid synchronous setState-in-effect
      const id = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(id);
    }

    const duration = 1500;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(hide, 200);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [hide]);

  return { visible, progress };
}

export default function Preloader() {
  const { visible, progress } = usePreloaderState();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 grid-pattern opacity-5" />

          <motion.div
            className="flex flex-col items-center gap-6 relative z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Logo with pulse */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Pulse ring behind logo */}
              <span className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative size-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/30 overflow-hidden">
                <Image src="/logo.png" alt="Lightworld Technologies" width={64} height={64} className="object-contain p-1" />
              </div>
            </motion.div>

            {/* Company name */}
            <div className="text-center">
              <motion.h2
                className="text-2xl font-bold text-slate-900 dark:text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Lightworld Technologies
              </motion.h2>
              <motion.p
                className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Powering Digital Innovation
              </motion.p>
            </div>

            {/* Progress bar */}
            <motion.div
              className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0 }}
              />
            </motion.div>

            {/* Loading text */}
            <motion.p
              className="text-xs text-slate-400 dark:text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              Loading experience...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
