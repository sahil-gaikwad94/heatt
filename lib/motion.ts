import type { Transition, Variants } from 'framer-motion';

/* ============================================================================
   lib/motion — the whole motion vocabulary.

   Two easings and one spring. Durations scale with distance, not importance.
   Anything that loops is ambient and longer than seven seconds, so nothing
   ever pulsates at reading speed. Exits are always faster than entrances.
   ==========================================================================*/

export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.6, 0, 0.2, 1] as const;

export const T = {
  micro: 0.16,
  fast: 0.24,
  base: 0.34,
  slow: 0.64,
  cinema: 1.2,
} as const;

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 30 };

/** the standard entrance: a short rise with a focus pull */
export const rise: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: T.slow, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: T.fast, ease: EASE_IN } },
};

export const riseFast: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: T.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE_IN } },
};

export const tileIn: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: T.slow, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: EASE_IN } },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: T.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
};

export const sheet: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.46, ease: EASE_OUT } },
  exit: { opacity: 0, y: 16, scale: 0.995, transition: { duration: 0.22, ease: EASE_IN } },
};

export const scenes: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.85, ease: EASE_OUT } },
  exit: { opacity: 0, y: -16, filter: 'blur(10px)', transition: { duration: 0.4, ease: EASE_IN } },
};

/** stagger container for lists that should arrive as a group, not a queue */
export const stagger = (each = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
});

/** scroll-reveal defaults shared by every <Reveal/> */
export const IN_VIEW = { once: true, margin: '-10% 0px -6% 0px' } as const;
