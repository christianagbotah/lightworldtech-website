'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const RING_RADIUS = 62;
const RING_STROKE = 3.5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const INITIAL_MIN_VISIBLE_MS = 700;
const ROUTE_MIN_VISIBLE_MS = 420;
const PRELOAD_CEILING = 96;
const COMPLETE_DURATION_MS = 360;
const NAVIGATION_WATCHDOG_MS = 10_000;

// 8 orbiting particle specs (angle offset, orbit radius, size, delay)
const PARTICLES = [
  { angle: 0,   orbit: 92, size: 5,  delay: 0 },
  { angle: 45,  orbit: 98, size: 4,  delay: 0.4 },
  { angle: 90,  orbit: 88, size: 6,  delay: 0.8 },
  { angle: 135, orbit: 96, size: 3.5, delay: 0.2 },
  { angle: 180, orbit: 90, size: 5,  delay: 0.6 },
  { angle: 225, orbit: 100, size: 4, delay: 1.0 },
  { angle: 270, orbit: 86, size: 4.5, delay: 0.3 },
  { angle: 315, orbit: 94, size: 3,  delay: 0.7 },
];

/* ------------------------------------------------------------------ */
/*  Custom hook – progress state + auto-hide                           */
/* ------------------------------------------------------------------ */
function usePreloaderState() {
  const pathname = usePathname();
  const progressRef = useRef(0);
  const cycleIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const previousPathRef = useRef<string | null>(null);
  const navigationStartedRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const clearCycleTimers = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
    rafRef.current = null;
    finishTimerRef.current = null;
    hideTimerRef.current = null;
    watchdogRef.current = null;
  }, []);

  const markReady = useCallback(() => {
    readyRef.current = true;
  }, []);

  const startCycle = useCallback((readyInitially: boolean, minimumVisibleMs: number) => {
    clearCycleTimers();
    const cycleId = ++cycleIdRef.current;
    const startedAt = performance.now();
    readyRef.current = readyInitially;
    progressRef.current = 0;
    setProgress(0);
    setExiting(false);
    setVisible(true);

    const commit = (value: number) => {
      if (cycleId !== cycleIdRef.current) return;
      const next = Math.max(progressRef.current, Math.min(100, Math.round(value)));
      if (next === progressRef.current) return;
      progressRef.current = next;
      setProgress(next);
    };

    let completionStartedAt: number | null = null;
    let completionStart = 0;

    const tick = (now: number) => {
      if (cycleId !== cycleIdRef.current) return;
      const elapsed = now - startedAt;

      if (!readyRef.current || elapsed < minimumVisibleMs) {
        const simulated = PRELOAD_CEILING * (1 - Math.exp(-elapsed / 1250));
        commit(simulated);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (completionStartedAt === null) {
        completionStartedAt = now;
        completionStart = progressRef.current;
      }

      const linear = Math.min((now - completionStartedAt) / COMPLETE_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - linear, 3);
      commit(completionStart + (100 - completionStart) * eased);

      if (linear < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      commit(100);
      finishTimerRef.current = window.setTimeout(() => {
        if (cycleId !== cycleIdRef.current) return;
        setExiting(true);
        hideTimerRef.current = window.setTimeout(() => {
          if (cycleId === cycleIdRef.current) setVisible(false);
        }, 800);
      }, 120);
    };

    rafRef.current = requestAnimationFrame(tick);

    // If a client navigation is cancelled or intercepted, never leave the
    // full-screen preloader stranded. The watchdog simply lets it complete.
    watchdogRef.current = window.setTimeout(() => {
      if (cycleId === cycleIdRef.current) readyRef.current = true;
    }, NAVIGATION_WATCHDOG_MS);
  }, [clearCycleTimers]);

  // Initial document load and every completed Next.js pathname transition.
  useEffect(() => {
    let scheduledRaf: number | null = null;
    const onLoad = () => markReady();

    if (previousPathRef.current === null) {
      previousPathRef.current = pathname;
      scheduledRaf = requestAnimationFrame(() => {
        const pageReady = document.readyState === 'complete';
        startCycle(pageReady, INITIAL_MIN_VISIBLE_MS);
        if (!pageReady) window.addEventListener('load', onLoad, { once: true });
      });
      return () => {
        if (scheduledRaf !== null) cancelAnimationFrame(scheduledRaf);
        window.removeEventListener('load', onLoad);
      };
    }

    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      if (navigationStartedRef.current) {
        navigationStartedRef.current = false;
        markReady();
      } else {
        // Covers programmatic router.push/replace calls that did not originate
        // from a normal anchor click. Defer the visual replay one frame so the
        // newly committed route can paint before the loader cycle starts.
        scheduledRaf = requestAnimationFrame(() => startCycle(true, ROUTE_MIN_VISIBLE_MS));
      }
    }

    return () => {
      if (scheduledRaf !== null) cancelAnimationFrame(scheduledRaf);
      window.removeEventListener('load', onLoad);
    };
  }, [markReady, pathname, startCycle]);

  // Start the same single branded loader as soon as an internal page link is
  // activated. Hash-only jumps, downloads, modified clicks and external links
  // are intentionally ignored.
  useEffect(() => {
    const beginNavigation = () => {
      navigationStartedRef.current = true;
      startCycle(false, ROUTE_MIN_VISIBLE_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;
      const currentUrl = new URL(window.location.href);
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) return;

      beginNavigation();
    };

    const onPopState = () => beginNavigation();

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      clearCycleTimers();
    };
  }, [clearCycleTimers, startCycle]);

  return { visible, progress, exiting };
}

/* ------------------------------------------------------------------ */
/*  Preloader Component                                                */
/* ------------------------------------------------------------------ */
export default function Preloader() {
  const { visible, progress, exiting } = usePreloaderState();

  // stroke-dashoffset: full circumference when 0%, 0 when 100%
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
                     bg-gradient-to-b from-slate-50 to-white
                     dark:from-slate-950 dark:to-slate-900"
          initial={{ opacity: 1 }}
          animate={exiting ? { opacity: 0, y: '-100%' } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            exiting
              ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0 }
          }
        >
          {/* Subtle radial glow behind the ring */}
          <div
            className="pointer-events-none absolute rounded-full opacity-30 blur-3xl"
            style={{
              width: 320,
              height: 320,
              background:
                'radial-gradient(circle, rgba(16 185 129 / 0.25) 0%, rgba(245 158 11 / 0.15) 50%, transparent 70%)',
            }}
          />

          {/* ---- Main content group ---- */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={
              exiting
                ? { opacity: 0, scale: 1.08, y: -20 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            transition={
              exiting
                ? { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } // spring-like overshoot
                : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
            }
          >
            {/* Ring + Logo container */}
            <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
              {/* Orbiting particles */}
              {PARTICLES.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: '50%', top: '50%', marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={exiting ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + p.delay * 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      background:
                        'radial-gradient(circle, rgba(52 211 153 / 0.85) 0%, rgba(251 191 36 / 0.6) 100%)',
                      boxShadow: `0 0 ${p.size * 2.5}px rgba(16 185 129 / 0.35), 0 0 ${p.size}px rgba(245 158 11 / 0.25)`,
                    }}
                    animate={
                      exiting
                        ? {}
                        : {
                            x: [
                              Math.cos((p.angle * Math.PI) / 180) * p.orbit,
                              Math.cos(((p.angle + 90) * Math.PI) / 180) * (p.orbit + 4),
                              Math.cos(((p.angle + 180) * Math.PI) / 180) * (p.orbit - 2),
                              Math.cos(((p.angle + 270) * Math.PI) / 180) * (p.orbit + 6),
                              Math.cos(((p.angle + 360) * Math.PI) / 180) * p.orbit,
                            ],
                            y: [
                              Math.sin((p.angle * Math.PI) / 180) * p.orbit,
                              Math.sin(((p.angle + 90) * Math.PI) / 180) * (p.orbit + 4),
                              Math.sin(((p.angle + 180) * Math.PI) / 180) * (p.orbit - 2),
                              Math.sin(((p.angle + 270) * Math.PI) / 180) * (p.orbit + 6),
                              Math.sin(((p.angle + 360) * Math.PI) / 180) * p.orbit,
                            ],
                          }
                    }
                    transition={
                      exiting
                        ? { duration: 0 }
                        : {
                            duration: 5 + p.delay,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: p.delay,
                          }
                    }
                  />
                </motion.div>
              ))}

              {/* SVG progress ring */}
              <svg
                className="absolute inset-0"
                width="160"
                height="160"
                viewBox="0 0 160 160"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <defs>
                  <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                {/* Continuous rotating border accents */}
                <motion.g
                  style={{ transformOrigin: '80px 80px' }}
                  animate={exiting ? { opacity: 0 } : { rotate: 360 }}
                  transition={exiting ? { duration: 0.25 } : { duration: 1.8, repeat: Infinity, ease: 'linear' }}
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    fill="none"
                    stroke="url(#ring-gradient)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="36 18 8 28"
                    className="opacity-70"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray="10 30 22 14"
                    className="text-amber-400/55"
                  />
                </motion.g>
                <motion.circle
                  cx="80"
                  cy="80"
                  r="76"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="14 34"
                  className="text-emerald-400/45"
                  style={{ transformOrigin: '80px 80px' }}
                  animate={exiting ? { opacity: 0 } : { rotate: -360 }}
                  transition={exiting ? { duration: 0.25 } : { duration: 2.7, repeat: Infinity, ease: 'linear' }}
                />

                {/* Background track */}
                <circle
                  cx="80"
                  cy="80"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={RING_STROKE}
                  className="text-slate-200 dark:text-slate-700/60"
                />
                {/* Animated progress arc */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#ring-gradient)"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition: exiting ? 'opacity 0.4s ease-out' : 'none',
                    opacity: exiting ? 0 : 1,
                  }}
                />
                {/* Glow layer for the progress arc */}
                <circle
                  cx="80"
                  cy="80"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#ring-gradient)"
                  strokeWidth={RING_STROKE + 4}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="opacity-15 blur-[3px]"
                  style={{
                    transition: exiting ? 'opacity 0.4s ease-out' : 'none',
                    opacity: exiting ? 0 : 0.15,
                  }}
                />
              </svg>

              {/* Logo in center */}
              <motion.div
                className="relative flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-lg shadow-amber-500/10 dark:shadow-amber-400/5"
                style={{ width: 96, height: 96 }}
                animate={exiting ? { scale: 1.12 } : {}}
                transition={
                  exiting
                    ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                    : { duration: 0 }
                }
              >
                {/* Subtle pulse behind logo */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-amber-500/10 dark:bg-amber-400/5"
                  animate={!exiting ? { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <Image
                  src="/logo.png"
                  alt="Lightworld Technologies"
                  width={48}
                  height={48}
                  className="relative z-10 object-contain"
                  priority
                />
              </motion.div>
            </div>

            {/* Percentage */}
            <motion.div
              className="mt-5 tabular-nums tracking-tight text-3xl font-semibold text-slate-800 dark:text-slate-100"
              initial={{ opacity: 0, y: 8 }}
              animate={exiting ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
              transition={
                exiting
                  ? { duration: 0.35, ease: 'easeIn' }
                  : { delay: 0.2, duration: 0.5, ease: 'easeOut' }
              }
            >
              {progress}
              <span className="text-lg text-slate-400 dark:text-slate-500">%</span>
            </motion.div>

            {/* Visible linear progress — mirrors the ring and never sits at a fixed midpoint. */}
            <div
              className="mt-3 h-1 w-44 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700/70"
              role="progressbar"
              aria-label="Loading website"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 will-change-transform"
                style={{
                  transform: `scaleX(${progress / 100})`,
                  transition: 'transform 120ms linear',
                }}
              />
            </div>

            {/* Company name */}
            <motion.h2
              className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
              initial={{ opacity: 0, y: 10 }}
              animate={exiting ? { opacity: 0, y: -14 } : { opacity: 1, y: 0 }}
              transition={
                exiting
                  ? { duration: 0.4, ease: 'easeIn', delay: 0.1 }
                  : { delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
              }
            >
              Lightworld{' '}
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-500 bg-clip-text text-transparent dark:from-amber-400 dark:via-amber-300 dark:to-amber-400">
                Technologies
              </span>
            </motion.h2>

            {/* Tagline */}
            <motion.p
              className="mt-1.5 text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500 sm:text-sm"
              initial={{ opacity: 0 }}
              animate={exiting ? { opacity: 0 } : { opacity: 1 }}
              transition={
                exiting
                  ? { duration: 0.3, ease: 'easeIn', delay: 0.15 }
                  : { delay: 0.55, duration: 0.5 }
              }
            >
              Loading your experience&hellip;
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}