'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  startOnView?: boolean;
  prefix?: string;
  suffix?: string;
}

export function useAnimatedCounter({
  end,
  duration = 2000,
  startOnView = true,
  prefix = '',
  suffix = '',
}: UseAnimatedCounterOptions) {
  const [count, setCount] = useState(0);
  const hasStartedRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const startAnimation = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

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
  }, [end, duration]);

  useEffect(() => {
    if (!startOnView) {
      startAnimation();
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
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
