'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Sparkles, Award, X, Zap } from 'lucide-react';

const announcements = [
  { id: 1, icon: Sparkles, text: 'New: AI-Powered Solutions now available — Transform your business with intelligent automation' },
  { id: 2, icon: Award, text: 'Lightworld Technologies wins 2024 Business Excellence Award — Proud to serve Ghana\'s digital future' },
  { id: 3, icon: Zap, text: 'Limited Offer: 20% off on all Web Development projects this month — Book your free consultation today' },
  { id: 4, icon: Megaphone, text: 'We\'re hiring! Join our growing team of developers, designers, and digital marketers' },
];

function useAnnouncementState() {
  // Start dismissed + unmounted to match server (no hydration mismatch)
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lw-announcement-dismissed');
    const dismissedAt = saved ? parseInt(saved, 10) : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const isDismissed = dismissedAt > 0 && (Date.now() - dismissedAt < oneDay);
    if (!isDismissed) {
      localStorage.removeItem('lw-announcement-dismissed');
    }
    // Batch both state updates in a single requestAnimationFrame callback
    // to avoid synchronous setState-in-effect lint error
    const id = requestAnimationFrame(() => {
      setDismissed(isDismissed);
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return { dismissed, setDismissed, mounted };
}

export default function AnnouncementBar() {
  const { dismissed, setDismissed, mounted } = useAnnouncementState();
  const [paused, setPaused] = useState(false);
  const offsetRef = useRef<HTMLDivElement[]>([]);
  const frameRef = useRef<number>(0);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem('lw-announcement-dismissed', Date.now().toString()); } catch {}
  }, [setDismissed]);

  // Marquee animation using DOM manipulation
  useEffect(() => {
    if (dismissed || paused || !mounted) return;

    const speed = 0.18;
    let lastTime = performance.now();
    let pos = 0;

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      pos -= speed * (delta / 16);
      if (pos < -100) pos = 0;

      offsetRef.current.forEach((el) => {
        if (el) {
          el.style.transform = `translateX(${pos}%)`;
        }
      });
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dismissed, paused, mounted]);

  // Don't render until mounted (avoids hydration mismatch)
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="relative z-[51] bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 overflow-hidden"
          style={{ backgroundSize: '200% 100%' }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 40, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Subtle noise overlay */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />

          {/* Scrolling marquee content */}
          <div
            className="flex items-center h-10"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Duplicate content for seamless loop */}
            {[0, 1].map((setIndex) => (
              <div
                key={setIndex}
                ref={(el) => { if (el) offsetRef.current[setIndex] = el; }}
                className="flex items-center shrink-0 whitespace-nowrap will-change-transform"
              >
                {announcements.map((announcement) => {
                  const Icon = announcement.icon;
                  return (
                    <span
                      key={`${setIndex}-${announcement.id}`}
                      className="inline-flex items-center gap-2 px-8 text-sm font-medium text-white/90"
                    >
                      <Icon className="size-4 text-amber-300 shrink-0" />
                      <span>{announcement.text}</span>
                      <span className="text-amber-400/40 mx-3">✦</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Gradient edge fades */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-emerald-900 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-emerald-900 to-transparent pointer-events-none z-10" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 z-20"
            aria-label="Dismiss announcement"
          >
            <X className="size-3 text-white" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
