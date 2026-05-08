'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  startOnView?: boolean;
  prefix?: string;
  suffix?: string;
  startDelay?: number;
}

export function useAnimatedCounter({
  end,
  duration = 2000,
  startOnView = true,
  prefix = '',
  suffix = '',
  startDelay = 0,
}: UseAnimatedCounterOptions) {
  const [count, setCount] = useState(0);
  const hasStartedRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const startAnimation = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const timer = setTimeout(() => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(end * eased);

        setCount(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [end, duration, startDelay]);

  useEffect(() => {
    if (!startOnView) {
      const cleanup = startAnimation();
      return cleanup;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const cleanup = startAnimation();
          observer.disconnect();
          return cleanup;
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [startAnimation, startOnView]);

  return {
    count,
    ref,
    displayValue: `${prefix}${count}${suffix}`,
  };
}
