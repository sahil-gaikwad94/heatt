'use client';
/* ============================================================================
   components/ui/motion — the motion primitives.

   The only place scroll observation, parallax, pointer tilt and count-ups are
   implemented. Screens compose these; they never re-invent them. Every one of
   them degrades to a static, fully visible state when the API is missing
   (jsdom, very old browsers) or when the user asked for less motion — a
   reveal must never be load-bearing for whether text is on screen.
   ==========================================================================*/

import * as React from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { EASE, EASE_OUT, IN_VIEW, rise, stagger } from '@/lib/motion';
import { cls } from '@/lib/util';

/* ------------------------------------------------------------ motion prefs */

export function useMotionPrefs() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const attr = document.documentElement.dataset.reduceMotion === 'true';
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(attr || mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return { reduced };
}

/* -------------------------------------------------------------- in-view ref */

/**
 * `useInView` that is safe everywhere: framer's hook needs an IntersectionObserver,
 * which jsdom and very old browsers lack — there we simply report "seen" so the
 * content is present rather than hidden behind an animation that never fires.
 */
export function useInViewSafe<T extends HTMLElement = HTMLDivElement>(
  margin: string = IN_VIEW.margin
): { ref: React.RefObject<T | null>; seen: boolean } {
  const ref = React.useRef<T | null>(null);
  const [seen, setSeen] = React.useState(false);
  const supported = React.useMemo(() => typeof window !== 'undefined' && 'IntersectionObserver' in window, []);
  React.useEffect(() => {
    if (!supported || seen) return;
    const el = ref.current;
    if (!el) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    /* never let a reveal keep content off screen */
    const t = window.setTimeout(() => setSeen(true), 900);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [supported, seen, margin]);
  return { ref, seen: seen || !supported };
}

/* ----------------------------------------------------------------- Reveal */

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, IN_VIEW);
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      ref={ref}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      animate={seen ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------- WordReveal */

/** Words resolve out of a blur, in order. One gesture, used sparingly. */
export function WordReveal({
  text,
  className,
  delay = 0,
  each = 0.06,
  play = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  each?: number;
  play?: boolean;
}) {
  const { reduced } = useMotionPrefs();
  const words = text.split(' ');
  return (
    <span className={cls('inline-block', className)}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={reduced ? false : { y: '108%', opacity: 0 }}
            animate={play ? { y: '0%', opacity: 1 } : undefined}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: delay + i * each }}
          >
            {w}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ Stagger */

export function Stagger({
  children,
  each = 0.05,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  each?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(each, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-8% 0px' }}
    >
      {children}
    </motion.div>
  );
}

export const item: Variants = rise;

/* ---------------------------------------------------------------- Parallax */

export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: React.ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { margin: '20% 0px 20% 0px' });
  const { reduced } = useMotionPrefs();
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (!seen || reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const progress = 1 - (rect.top + rect.height / 2) / (window.innerHeight + rect.height / 2);
        setOffset((progress - 0.5) * distance);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [seen, distance, reduced]);

  return (
    <div ref={ref} className={className}>
      <div style={{ transform: `translate3d(0,${offset.toFixed(1)}px,0)`, willChange: 'transform' }}>{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------- Tilt */

/** Pointer-driven 3D tilt. Transform only, disabled on touch and reduced motion. */
export function Tilt({
  children,
  intensity = 6,
  lift = 2,
  className,
}: {
  children: React.ReactNode;
  intensity?: number;
  lift?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { reduced } = useMotionPrefs();
  const [t, setT] = React.useState({ x: 0, y: 0, active: false });

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ x: -py * intensity, y: px * intensity, active: true });
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={() => setT({ x: 0, y: 0, active: false })}
      style={{
        transform: `perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg) translateY(${t.active ? -lift : 0}px)`,
        transition: 'transform 420ms cubic-bezier(.22,1,.36,1)',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ CountUp */

/** Counts on first view. Mono, tabular, no bounce. */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const seen = useInView(ref, { once: true, margin: '-10% 0px' });
  const { reduced } = useMotionPrefs();
  const [n, setN] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (!seen) return;
    if (reduced) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  );
}

/* --------------------------------------------------------------- PressBloom */

/** A single expanding ring from the contact point. Used on the heat control. */
export function PressBloom({ tone = 'heat' }: { tone?: 'heat' | 'cool' }) {
  const color = tone === 'heat' ? 'rgba(232,211,164,.55)' : 'rgba(107,162,255,.5)';
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      initial={{ opacity: 0.8, scale: 0.92 }}
      animate={{ opacity: 0, scale: 1.3 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{ boxShadow: `0 0 0 1px ${color}, 0 0 26px 4px ${color}` }}
    />
  );
}

/* ---------------------------------------------------------------- AmbientGlow */

/** The one looping element in the app: a slow, oversized room light. */
export function AmbientGlow({
  className,
  tone = 'cool',
  size = 620,
}: {
  className?: string;
  tone?: 'cool' | 'warm';
  size?: number;
}) {
  const c = tone === 'warm' ? 'rgba(232,211,164,.16)' : 'rgba(107,162,255,.16)';
  return (
    <span
      aria-hidden
      className={cls('pointer-events-none absolute rounded-full ht-breathe', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${c}, transparent 68%)`,
        filter: 'blur(50px)',
      }}
    />
  );
}
