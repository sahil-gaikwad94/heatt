'use client';
import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from '@/lib/app';

/**
 * Client boundary for the whole app. `MotionConfig` with
 * `reducedMotion="user"` means every framer-motion animation in the tree
 * honours the OS setting without each component remembering to check:
 * transforms and opacity still render, they just arrive instantly.
 *
 * The service worker is registered here too — production only, and only
 * after the room has painted, so a repeat visit opens from cache without
 * anything ever being served stale.
 */
export function ShellProviders({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is an optimisation, never a requirement */
      });
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>{children}</AppProvider>
    </MotionConfig>
  );
}
