'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypedTextOptions {
  strings: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
}

export function useTypedText({
  strings,
  typeSpeed = 80,
  deleteSpeed = 40,
  pauseDuration = 2000,
}: UseTypedTextOptions) {
  const [displayText, setDisplayText] = useState('');
  const [stringIndex, setStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const currentString = strings[stringIndex];

    if (isPaused) {
      timerRef.current = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimer();
    }

    if (!isDeleting) {
      if (displayText.length < currentString.length) {
        timerRef.current = setTimeout(() => {
          setDisplayText(currentString.slice(0, displayText.length + 1));
        }, typeSpeed + Math.random() * 40);
      } else {
        timerRef.current = setTimeout(() => {
          setIsPaused(true);
        }, 0);
      }
    } else {
      if (displayText.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayText(prev => prev.slice(0, -1));
        }, deleteSpeed);
      } else {
        timerRef.current = setTimeout(() => {
          setIsDeleting(false);
          setStringIndex((prev) => (prev + 1) % strings.length);
        }, 0);
      }
    }

    return () => clearTimer();
  }, [displayText, stringIndex, isDeleting, isPaused, strings, typeSpeed, deleteSpeed, pauseDuration, clearTimer]);

  return { displayText, isDeleting };
}
