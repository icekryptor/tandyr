'use client';

import { useEffect } from 'react';

/**
 * Registers the hand-rolled service worker (`public/sw.js`).
 * Production-only: in dev a SW would cache-poison hot reloads.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: e.g. private browsing mode. The app works without a SW.
    });
  }, []);

  return null;
}
