'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { useAppStore } from '@/lib/store';

export default function PageLoader() {
  const { currentPage } = useAppStore();
  const progress = useMotionValue(0);
  const spring = useSpring(progress, { stiffness: 300, damping: 30, restDelta: 0.001 });
  const width = useTransform(spring, (v) => `${v}%`);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear any previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const t: NodeJS.Timeout[] = [];

    // Reset
    progress.set(0);

    t.push(setTimeout(() => animate(progress, 30, { duration: 0.3 }), 50));
    t.push(setTimeout(() => animate(progress, 60, { duration: 0.4 }), 200));
    t.push(setTimeout(() => animate(progress, 90, { duration: 0.5 }), 500));
    t.push(setTimeout(() => {
      animate(progress, 100, { duration: 0.3 });
      // Fade out after reaching 100%
      t.push(setTimeout(() => {
        animate(progress, 0, { duration: 0.2 });
      }, 400));
    }, 900));

    timeoutsRef.current = t;

    return () => {
      t.forEach(clearTimeout);
    };
  }, [currentPage, progress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500"
        style={{ width }}
      />
    </div>
  );
}
