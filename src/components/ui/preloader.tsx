'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const RING_RADIUS = 62;
const RING_STROKE = 3.5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MIN_DURATION = 2000; // ms – ensures the animation always plays fully

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
  const initialized = useRef(false);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const hide = useCallback(() => {
    setExiting(true);
    // Wait for exit animation (~800 ms) then unmount
    setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem('lw-preloader-shown', 'true'); } catch {}
    }, 800);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // If already shown this session, skip immediately
    const alreadyShown = sessionStorage.getItem('lw-preloader-shown');
    if (alreadyShown) {
      const id = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(id);
    }

    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;

      // Use a smooth easeOut curve so it feels natural
      const linear = Math.min(elapsed / MIN_DURATION, 1);
      const eased = 1 - Math.pow(1 - linear, 3); // easeOutCubic
      const pct = Math.round(eased * 100);

      setProgress(pct);

      if (linear < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Wait for page load to also be ready before exiting
        if (document.readyState === 'complete') {
          // Small extra pause so the user sees 100 %
          setTimeout(hide, 300);
        } else {
          window.addEventListener('load', () => setTimeout(hide, 300), { once: true });
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hide]);

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
                className="relative flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-400/5"
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
                  className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-400/5"
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
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-emerald-300 dark:to-amber-400">
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
