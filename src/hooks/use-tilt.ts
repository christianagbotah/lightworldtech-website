'use client';

import { useRef, useCallback } from 'react';

interface TiltOptions {
  max?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

export function useTilt(options: TiltOptions = {}) {
  const {
    max = 10,
    perspective = 1000,
    scale = 1.02,
    speed = 400,
  } = options;

  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -max;
      const rotateY = ((x - centerX) / centerX) * max;

      // Calculate the position for the gradient highlight (0-100%)
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;

      el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      el.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;

      // Update the gradient highlight position
      const highlight = el.querySelector('[data-tilt-highlight]') as HTMLElement;
      if (highlight) {
        highlight.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, oklch(0.765 0.177 163.223 / 0.15), transparent 60%)`;
        highlight.style.opacity = '1';
      }
    },
    [max, perspective, scale, speed]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    el.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;

    const highlight = el.querySelector('[data-tilt-highlight]') as HTMLElement;
    if (highlight) {
      highlight.style.opacity = '0';
    }
  }, [perspective, speed]);

  return { ref, handleMouseMove, handleMouseLeave };
}
