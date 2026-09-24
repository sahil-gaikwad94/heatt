'use client';
/* ============================================================================
   components/boot/AppGate — the shell guard + route transition.

   A first-time visitor must clear the intro and the tour before the shell is
   interactive; a returning reader gets the app instantly. Page changes are a
   single short fade with a slight rise — one movement, not a slideshow.
   ==========================================================================*/

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ThreadSheet } from '@/components/thread/ThreadSheet';
import { EASE_OUT } from '@/lib/motion';

export function AppGate({ children }: { children: React.ReactNode }) {
  const introSeen = useStore((s) => s.introSeen);
  const onboarded = useStore((s) => s.onboarded);
  const path = usePathname();
  const blocked = !introSeen || !onboarded;

  React.useEffect(() => {
    if (!blocked) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [blocked]);

  return (
    <>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: EASE_OUT }}
        style={blocked ? { opacity: 0, pointerEvents: 'none' } : undefined}
      >
        {children}
      </motion.div>
      <ThreadSheet />
    </>
  );
}
