'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useAppStore } from '@/lib/store';

export default function PageLoader() {
  const { currentPage } = useAppStore();
  const progress = useMotionValue(0);
  const springProgress = useSpring(progress, { stiffness: 300, damping: 30, mass: 0.5 });

  // Reset and animate progress whenever currentPage changes
  progress.set(0);
  const timeout1 = setTimeout(() => progress.set(30), 50);
  const timeout2 = setTimeout(() => progress.set(60), 150);
  const timeout3 = setTimeout(() => progress.set(90), 300);
  const timeout4 = setTimeout(() => progress.set(100), 400);

  // Clear timeouts on re-render (React will clean up via the module-level setup)
  clearTimeout(timeout1);
  clearTimeout(timeout2);
  clearTimeout(timeout3);
  clearTimeout(timeout4);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-400"
        style={{ width: springProgress }}
      />
    </motion.div>
  );
}
