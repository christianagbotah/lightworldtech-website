'use client';

import { motion } from 'framer-motion';

type DividerVariant = 'wave' | 'curve' | 'angle' | 'dots';

interface SectionDividerProps {
  variant?: DividerVariant;
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  flip?: boolean;
}

export default function SectionDivider({
  variant = 'wave',
  className = '',
  flip = false,
}: SectionDividerProps) {
  const transform = flip ? 'scaleY(-1)' : 'scaleY(1)';

  if (variant === 'wave') {
    return (
      <motion.div
        className={`relative w-full overflow-hidden leading-[0] ${className}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <svg
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          className="relative block w-full h-16 md:h-24"
          style={{ transform }}
        >
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.765 0.177 163.223 / 0.15)" />
              <stop offset="50%" stopColor="oklch(0.828 0.189 84.429 / 0.2)" />
              <stop offset="100%" stopColor="oklch(0.596 0.145 163.225 / 0.15)" />
            </linearGradient>
          </defs>
          <path
            d="M0,40 C240,100 480,0 720,50 C960,100 1200,20 1440,60 L1440,100 L0,100 Z"
            fill="url(#waveGrad)"
          />
          <path
            d="M0,60 C200,20 400,80 600,40 C800,0 1000,70 1200,30 C1320,10 1400,50 1440,40 L1440,100 L0,100 Z"
            fill="oklch(0.596 0.145 163.225 / 0.08)"
          />
        </svg>
      </motion.div>
    );
  }

  if (variant === 'curve') {
    return (
      <motion.div
        className={`relative w-full overflow-hidden leading-[0] ${className}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-20"
          style={{ transform }}
        >
          <defs>
            <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.765 0.177 163.223 / 0.12)" />
              <stop offset="100%" stopColor="oklch(0.828 0.189 84.429 / 0.12)" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z"
            fill="url(#curveGrad)"
          />
        </svg>
      </motion.div>
    );
  }

  if (variant === 'angle') {
    return (
      <motion.div
        className={`relative w-full overflow-hidden leading-[0] ${className}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <svg
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          className="relative block w-full h-8 md:h-14"
          style={{ transform }}
        >
          <defs>
            <linearGradient id="angleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.596 0.145 163.225 / 0.1)" />
              <stop offset="100%" stopColor="oklch(0.828 0.189 84.429 / 0.15)" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L1440,60 L1440,0 Z"
            fill="url(#angleGrad)"
          />
        </svg>
      </motion.div>
    );
  }

  // dots variant
  return (
    <motion.div
      className={`relative w-full py-6 md:py-8 flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex items-center gap-2">
        {/* Left line */}
        <div className="flex-1 max-w-32 h-px bg-gradient-to-r from-transparent to-emerald-300 dark:to-emerald-700" />
        {/* Center dots */}
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500" />
          <span className="size-2 rounded-full bg-gradient-to-br from-emerald-400 to-amber-400 dark:from-emerald-500 dark:to-amber-500" />
          <span className="size-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
          <span className="size-1 rounded-full bg-emerald-300 dark:bg-emerald-600" />
          <span className="size-1.5 rounded-full bg-amber-300 dark:bg-amber-600" />
        </div>
        {/* Right line */}
        <div className="flex-1 max-w-32 h-px bg-gradient-to-l from-transparent to-emerald-300 dark:to-emerald-700" />
      </div>
    </motion.div>
  );
}
