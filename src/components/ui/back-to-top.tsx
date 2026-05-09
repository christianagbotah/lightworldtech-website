'use client';

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useTheme } from 'next-themes';

const SCROLL_THRESHOLD = 300;
const THROTTLE_MS = 16; // ~60fps

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastRun = useRef(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Hydration-safe mounted check (avoids setState-in-effect)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastRun.current < THROTTLE_MS) return;
    lastRun.current = now;

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;

    setIsVisible(scrollY > SCROLL_THRESHOLD);

    if (docHeight > 0) {
      const pct = Math.min(scrollY / docHeight, 1);
      setProgress(pct);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Defer initial read to avoid synchronous setState in effect
    const id = requestAnimationFrame(handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(id);
    };
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Don't render until hydrated to avoid theme flash
  if (!mounted) return null;

  const circumference = 2 * Math.PI * 18; // radius=18
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="group fixed bottom-24 right-6 z-[65] focus:outline-none"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Outer glow ring */}
          <span
            className={`absolute inset-[-3px] rounded-full blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-60 ${
              isDark
                ? 'bg-amber-400/40'
                : 'bg-emerald-400/40'
            }`}
          />

          {/* Button body */}
          <span
            className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-shadow duration-300 group-hover:shadow-xl ${
              isDark
                ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
            }`}
          >
            {/* Progress circle background track */}
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 44 44"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                strokeWidth="2.5"
                className={isDark ? 'stroke-amber-800/50' : 'stroke-emerald-800/30'}
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={
                  isDark
                    ? 'stroke-amber-200/80'
                    : 'stroke-emerald-100/80'
                }
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 0.15s ease-out',
                }}
              />
            </svg>

            {/* Arrow icon */}
            <ArrowUp
              className={`relative h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                isDark ? 'text-amber-100' : 'text-white'
              }`}
              strokeWidth={2.5}
            />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
