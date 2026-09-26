'use client';

import { useEffect } from 'react';

export default function PwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((error) => {
          console.warn('Lightworld service worker registration failed', error);
        });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
