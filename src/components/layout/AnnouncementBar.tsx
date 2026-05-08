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

function getDismissedState(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('lw-announcement-dismissed');
  const dismissedAt = saved ? parseInt(saved, 10) : 0;
  const oneDay = 24 * 60 * 60 * 1000;
  if (Date.now() - dismissedAt < oneDay) return true;
  localStorage.removeItem('lw-announcement-dismissed');
  return false;
}

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(getDismissedState);
  const [paused, setPaused] = useState(false);
  const offsetRef = useRef<HTMLDivElement[]>([]);
  const frameRef = useRef<number>(0);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('lw-announcement-dismissed', Date.now().toString());
  }, []);

  // Marquee animation using DOM manipulation (no setState in effect)
  useEffect(() => {
    if (dismissed || paused) return;

    const speed = 0.5;
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
  }, [dismissed, paused]);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="relative z-[51] bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Scrolling marquee content */}
          <div
            className="flex items-center h-9"
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
                      className="inline-flex items-center gap-2 px-8 text-xs font-medium text-white/90"
                    >
                      <Icon className="size-3.5 text-amber-300 shrink-0" />
                      <span>{announcement.text}</span>
                      <span className="text-white/30 mx-2">•</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Gradient edge fades */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-emerald-700 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-emerald-700 to-transparent pointer-events-none z-10" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-20"
            aria-label="Dismiss announcement"
          >
            <X className="size-3 text-white" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
