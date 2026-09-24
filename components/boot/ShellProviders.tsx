'use client';
import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from '@/lib/app';

/**
 * Client boundary for the whole app. `MotionConfig` with
 * `reducedMotion="user"` means every framer-motion animation in the tree
 * honours the OS setting without each component remembering to check:
 * transforms and opacity still render, they just arrive instantly.
 */
export function ShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>{children}</AppProvider>
    </MotionConfig>
  );
}
