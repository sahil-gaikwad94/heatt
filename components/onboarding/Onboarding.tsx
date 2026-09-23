'use client';
/* ============================================================================
   components/onboarding/Onboarding — a cinematic, form-free introduction.

   Three full-bleed scenes, each with a parallax camera pan (a blurred plate
   behind, a sharp plate in front, both drifting against pointer/gyro), type
   that fades in word by word, and one glowing control: **swipe to start**.
   Nothing to fill in — the account already exists, and every detail is editable
   later from the profile. No forms, no fences.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atmosphere } from '@/components/gl/Atmosphere';
import { useStore } from '@/lib/store';
import { useTilt } from '@/lib/tilt';

const EASE = [0.22, 1, 0.36, 1] as const;
const SCENE_MS = 5200;

const INTERESTS = ['design', 'engineering', 'reading'];

const SCENES = [
  {
    img: '/art/hero-forge.jpg',
    kicker: 'two modalities, one feed',
    title: 'Chase your curiosity',
    sub: 'A 280-character spark and a 4,000-word forge live in the same board — ranked by the same physics, read in the same place.',
  },
  {
    img: '/art/deep-read.jpg',
    kicker: 'long-form, all of it',
    title: 'Read it here, not elsewhere',
    sub: 'Full articles render natively: real typography, inline code, figures and references. No redirects, no “keep reading” wall.',
  },
  {
    img: '/art/story-canvas.jpg',
    kicker: 'your heat is the algorithm',
    title: 'Attention with a temperature',
    sub: 'Hold to heat, hold longer to ignite. Every read warms the board for the people who arrive after you — cooling is a promise, not a punishment.',
  },
];

const NAMES: [string, string][] = [
  ['quiet', 'kiln'],
  ['slow', 'ember'],
  ['north', 'forge'],
  ['paper', 'signal'],
  ['cold', 'furnace'],
  ['deep', 'reader'],
  ['night', 'smith'],
  ['open', 'flame'],
  ['still', 'anvil'],
  ['early', 'draft'],
];

const COVER = '/art/deep-read.jpg';

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = React.useState(0);
  const [starting, setStarting] = React.useState(false);
  const [seed] = React.useState(() => Math.floor(Math.random() * 1e6));
  const tilt = useTilt();
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    setReduced(
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset.reduceMotion === 'true'
    );
  }, []);

  /* auto-advance the reel — but never while the user is mid-gesture */
  React.useEffect(() => {
    if (reduced || starting) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(id);
  }, [reduced, starting]);

  const [a, b] = NAMES[seed % NAMES.length];
  const handle = `${a}-${b}-${(seed % 89) + 10}`;
  const name = `${a} ${b}`.replace(/\b\w/g, (c) => c.toUpperCase());

  const start = React.useCallback(() => {
    if (starting) return;
    setStarting(true);
    const s = useStore.getState();
    s.completeOnboarding(
      { handle, name, bio: 'New here. Reading first.', cover: COVER },
      INTERESTS
    );
    useStore.setState((st) => ({
      prefs: { ...st.prefs, ignitionFx: 'subtle', ambient: true },
      interests: INTERESTS,
    }));
    s.logActivity('reads');
    window.setTimeout(onDone, 900);
  }, [handle, name, onDone, starting]);

  /* ↵ / space / → start, ← → step */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.key === 'ArrowRight' && !starting) setI((v) => (v + 1) % SCENES.length);
        else start();
      }
      if (e.key === 'Escape') start();
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + SCENES.length) % SCENES.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, starting]);

  const scene = SCENES[i];
  const px = reduced ? 0 : tilt.x;
  const py = reduced ? 0 : tilt.y;

  return (
    <div className="fixed inset-0 z-[190] overflow-hidden bg-black">
      {/* ------------------------------------------------------------- plates */}
      <AnimatePresence>
        <motion.div
          key={scene.img}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: EASE }}
          className="absolute inset-0"
          aria-hidden
        >
          {/* blurred plate, drifting one way */}
          <img
            src={scene.img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(1.28) translate3d(${px * -14}px, ${py * -10}px, 0)`,
              filter: 'blur(34px) saturate(115%) brightness(.62)',
            }}
          />
          {/* sharp plate, drifting the other way — the camera pan */}
          <img
            src={scene.img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(1.06) translate3d(${px * 10}px, ${py * 7}px, 0)`,
              filter: 'saturate(104%) contrast(104%)',
            }}
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.28) 32%, rgba(0,0,0,.78) 72%, #000 100%)',
            }}
          />
          <span
            className="absolute inset-0"
            style={{ background: 'radial-gradient(90% 70% at 22% 78%, rgba(0,229,160,.16), transparent 62%)' }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <Atmosphere />
      </div>

      {/* --------------------------------------------------------- content */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1180px] flex-col px-6 pb-8 pt-8 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <span className="ht-title ht-heat-text text-[22px] leading-none">heatt</span>
          <div className="flex items-center gap-2" role="tablist" aria-label="Scenes">
            {SCENES.map((s, idx) => (
              <button
                key={s.img}
                onClick={() => setI(idx)}
                aria-label={`Scene ${idx + 1}: ${s.kicker}`}
                className="relative h-[3px] w-8 overflow-hidden rounded-full bg-white/15 sm:w-12"
              >
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'var(--ht-ember)' }}
                  animate={{ width: idx < i ? '100%' : idx === i ? '100%' : '0%' }}
                  transition={{ duration: idx === i && !reduced ? SCENE_MS / 1000 : 0.4, ease: 'linear' }}
                  initial={{ width: '0%' }}
                />
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-1 items-end pb-10 sm:pb-14">
          <div className="max-w-[46rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <p className="ht-label text-ember-300">{scene.kicker}</p>
                <h1 className="ht-title mt-3 text-[clamp(2.4rem,1.5rem+5.2vw,5.4rem)] leading-[0.98] text-white">
                  {scene.title.split(' ').map((w, idx) => (
                    <motion.span
                      key={`${w}-${idx}`}
                      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.05 + idx * 0.07, duration: 0.7, ease: EASE }}
                      className="mr-[0.24em] inline-block"
                    >
                      {w}
                    </motion.span>
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="mt-5 max-w-[54ch] text-[clamp(.95rem,.88rem+.35vw,1.15rem)] leading-relaxed text-ink-dim"
                >
                  {scene.sub}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ------------------------------------------------------ the control */}
        <SwipeToStart onDone={start} starting={starting} />
      </div>

      <AnimatePresence>
        {starting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 grid place-items-center bg-black"
          >
            <div className="text-center">
              <motion.h2
                initial={{ scale: 0.9, opacity: 0, filter: 'blur(16px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: EASE }}
                className="ht-title ht-heat-text text-[clamp(2.2rem,1.4rem+5vw,5rem)]"
              >
                Welcome, @{handle}
              </motion.h2>
              <p className="mt-3 text-[13.5px] text-ink-dim">
                Your board is warm. Rename yourself any time from your profile.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ slider */

function SwipeToStart({ onDone, starting }: { onDone: () => void; starting: boolean }) {
  const track = React.useRef<HTMLDivElement | null>(null);
  const [max, setMax] = React.useState(260);
  const [x, setX] = React.useState(0);

  React.useEffect(() => {
    const measure = () => {
      const w = track.current?.clientWidth ?? 0;
      if (w) setMax(Math.max(120, w - 62));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const done = React.useCallback(() => {
    setX(max);
    window.setTimeout(onDone, 180);
  }, [max, onDone]);

  return (
    <div className="pb-1">
      <div
        ref={track}
        className="ht-swipe relative flex h-[62px] items-center rounded-full px-2"
        role="button"
        tabIndex={0}
        aria-label="Swipe to start"
        onClick={done}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') done();
        }}
      >
        <motion.span
          aria-hidden
          className="ht-swipe-fill absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.max(58, x + 58)}px` }}
        />
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: max }}
          dragElastic={0.03}
          dragMomentum={false}
          animate={{ x }}
          onDrag={(_, info) => setX(Math.max(0, Math.min(max, info.offset.x)))}
          onDragEnd={(_, info) => {
            if (info.offset.x > max * 0.78) done();
            else setX(0);
          }}
          className="relative z-10 grid h-[46px] w-[46px] shrink-0 cursor-grab place-items-center rounded-full active:cursor-grabbing"
          style={{
            background: 'linear-gradient(135deg,var(--ht-ember),var(--ht-flare))',
            boxShadow: '0 12px 34px -12px rgba(0,229,160,.75), 0 1px 0 rgba(255,255,255,.5) inset',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#04140E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </motion.div>
        <span
          className="pointer-events-none absolute inset-0 grid place-items-center text-[13.5px] font-semibold tracking-[0.01em] text-white/85"
          style={{ paddingLeft: 54 }}
        >
          {starting ? 'Starting…' : 'Swipe to start'}
        </span>
      </div>
      <p className="mt-3 text-center text-[11.5px] text-ink-mute">
        No sign-up form. Your handle is generated — change it whenever you like.
      </p>
    </div>
  );
}
