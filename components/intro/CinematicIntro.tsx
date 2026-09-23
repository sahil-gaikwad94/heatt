'use client';
/* ============================================================================
   components/intro/CinematicIntro — the title sequence.

   ~4.4s of slow parallax: two plates pan against each other behind a soft
   depth-of-field, a line of type fades in rather than slamming in, and the
   wordmark resolves out of the fog before the room hands over. No canvas, no
   streak field, no rAF churn — and it is one click or keypress from being over.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const TOTAL = 4.4;
const EASE = [0.22, 1, 0.36, 1] as const;

type Act = 'spread' | 'form' | 'handoff';
const actAt = (t: number): Act => (t < 2.5 ? 'spread' : t < 3.9 ? 'form' : 'handoff');

const PLATES = [
  { img: '/art/hero-forge.jpg', line: 'Chase your curiosity' },
  { img: '/art/deep-read.jpg', line: 'Read it all, right here' },
];

export function CinematicIntro({ onDone, done }: { onDone: () => void; done: boolean }) {
  const [t, setT] = React.useState(0);
  const [exiting, setExiting] = React.useState(false);
  const progress = useMotionValue(0);
  const bar = useTransform(progress, (v) => `${v * 100}%`);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const reduced = React.useRef(false);
  const finished = React.useRef(false);

  const finish = React.useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setExiting(true);
    window.setTimeout(onDone, 460);
  }, [onDone]);

  React.useEffect(() => {
    reduced.current =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.reduceMotion === 'true';
    if (reduced.current) {
      setReducedMotion(true);
      progress.set(1);
      setT(TOTAL);
      const id = window.setTimeout(finish, 1100);
      return () => window.clearTimeout(id);
    }
    if (done) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const v = Math.min(TOTAL, (now - t0) / 1000);
      setT(v);
      progress.set(v / TOTAL);
      if (v < TOTAL) raf = requestAnimationFrame(loop);
      else finish();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const act = actAt(t);
  const plate = t < 2.5 ? 0 : 1;
  const pan = reducedMotion ? 0 : t / TOTAL;

  return (
    <div
      onClick={finish}
      className="fixed inset-0 z-[200] cursor-pointer select-none overflow-hidden bg-black"
      style={{ animation: exiting ? 'ht-intro-out .46s cubic-bezier(.6,0,.2,1) forwards' : undefined }}
    >
      {/* the room: one cool haze, almost nothing */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 34%, rgba(0,229,160,.14), transparent 64%), radial-gradient(110% 80% at 50% 118%, rgba(61,220,255,.1), transparent 62%)',
        }}
      />

      {/* the plates: blurred plate drifts one way, sharp plate the other */}
      <AnimatePresence>
        <motion.div
          key={PLATES[plate].img}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
          className="absolute inset-0"
          aria-hidden
        >
          <img
            src={PLATES[plate].img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${1.34 - pan * 0.16}) translate3d(${pan * -22}px, ${pan * -10}px, 0)`,
              filter: 'blur(36px) saturate(110%) brightness(.5)',
            }}
          />
          <img
            src={PLATES[plate].img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${1.1 + pan * 0.06}) translate3d(${pan * 18}px, ${pan * 8}px, 0)`,
              filter: 'saturate(102%) contrast(105%) brightness(.9)',
            }}
          />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.66), rgba(0,0,0,.3) 40%, rgba(0,0,0,.82))' }} />
        </motion.div>
      </AnimatePresence>

      {/* typography, gently */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          {act !== 'form' ? (
            <motion.p
              key={PLATES[plate].line}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
              className="ht-title text-[clamp(1.9rem,1.1rem+3.6vw,3.6rem)] leading-[1.04] text-white"
              style={{ textShadow: '0 0 60px rgba(0,0,0,.9)' }}
            >
              {PLATES[plate].line}
            </motion.p>
          ) : (
            <motion.div
              key="mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <Wordmark />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
                className="mt-6 max-w-[44ch] text-[clamp(.95rem,.85rem+.4vw,1.15rem)] leading-relaxed text-ink-dim"
              >
                Sparks and full-length forges in one feed, ranked by one honest physics model —
                <span className="text-white"> every word read here, never somewhere else.</span>
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="mt-6 flex flex-wrap items-center justify-center gap-2"
              >
                {['heat, not likes', 'hold to ignite', 'no redirects', 'read it all in-app'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/[.14] px-3 py-1.5 text-[11px] font-semibold tracking-[0.03em] text-white/80"
                  >
                    {chip}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* chrome */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-5 sm:p-7">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/35">
          {act === 'spread' ? 'SPREAD' : act === 'form' ? 'FORM' : 'HANDOFF'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="ht-btn ht-btn--ghost !text-[12px] !text-white/80"
        >
          Skip intro <span className="opacity-50">↵</span>
        </button>
      </div>

      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
        style={{ width: bar, background: 'linear-gradient(90deg,rgba(61,220,255,.9),var(--ht-ember) 60%,var(--ht-whitehot))', boxShadow: '0 0 16px rgba(0,229,160,.5)' }}
      />

      <style>{`@keyframes ht-intro-out{to{opacity:0;transform:scale(1.03);filter:blur(8px)}}`}</style>
    </div>
  );
}

function Wordmark() {
  const letters = ['h', 'e', 'a', 't', 't'];
  return (
    <div className="relative">
      <h1
        aria-label="heatt"
        className="ht-title ht-heat-text flex select-none text-[clamp(3.4rem,1.6rem+12vw,9rem)] leading-[0.84]"
      >
        {letters.map((l, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.07, duration: 0.6, ease: EASE }}
            className="inline-block"
          >
            {l}
          </motion.span>
        ))}
      </h1>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{ background: 'radial-gradient(50% 60% at 50% 60%, rgba(0,229,160,.24), transparent 70%)' }}
      />
    </div>
  );
}
