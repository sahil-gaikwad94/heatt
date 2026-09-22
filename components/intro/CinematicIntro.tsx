'use client';
/* ============================================================================
   components/intro/CinematicIntro — 8.4s GPU title sequence
   spec §4: "a cinematic, visually immersive sequence powered by real-time
   WebGL rendering."

   Six acts over 8.4 seconds, driven by one clock so audio, type and the shader
   stay in lockstep:

     0.0  void        — nothing but noise, one spark
     1.2  ignition    — the spark becomes a heat field (surge uniform)
     2.8  spread       — heat diffuses into a graph of nodes (feed metaphor)
     4.6  form         — molten metal resolves into the wordmark
     6.4  settle       — mark locks, tagline types, chips fade in
     7.6  handoff      — the field recedes into the app's ambient background

   Skippable at all times (any key / click / tap), auto-advances, honours
   prefers-reduced-motion by jumping to the final frame.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { HeatField } from '@/components/gl/HeatField';

const TOTAL = 8.4;

type Act = { at: number; until: number; key: string };
const ACTS: Act[] = [
  { at: 0, until: 1.2, key: 'void' },
  { at: 1.2, until: 2.8, key: 'ignition' },
  { at: 2.8, until: 4.6, key: 'spread' },
  { at: 4.6, until: 6.4, key: 'form' },
  { at: 6.4, until: 7.6, key: 'settle' },
  { at: 7.6, until: TOTAL, key: 'handoff' },
];

export function CinematicIntro({ onDone, done }: { onDone: () => void; done: boolean }) {
  const [t, setT] = React.useState(0);
  const [skipped, setSkipped] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  const [nodes, setNodes] = React.useState<{ x: number; y: number; d: number; s: number }[]>([]);
  const progress = useMotionValue(0);
  const bar = useTransform(progress, (v) => `${v * 100}%`);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const reduced = React.useRef(false);

  React.useEffect(() => {
    reduced.current =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.reduceMotion === 'true';
    // build the diffusion graph once: 26 nodes on a jittered lattice
    const n = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2;
      const r = 12 + ((i * 37) % 34);
      return {
        x: 50 + Math.cos(a * 1.7) * r,
        y: 50 + Math.sin(a * 2.3) * (r * 0.62),
        d: 0.1 + ((i * 13) % 40) / 100,
        s: 0.5 + ((i * 29) % 100) / 120,
      };
    });
    setNodes(n);
  }, []);

  /* ------------------------------------------------------------ master clock */
  React.useEffect(() => {
    if (done) return;
    if (reduced.current) {
      setT(TOTAL);
      progress.set(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const el = (now - t0) / 1000;
      const v = Math.min(TOTAL, el);
      setT(v);
      progress.set(v / TOTAL);
      if (v < TOTAL && !skipped) raf = requestAnimationFrame(loop);
      else if (v >= TOTAL) finish();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipped, done]);

  const finish = React.useCallback(() => {
    setExiting(true);
    window.setTimeout(() => onDone(), 520);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = React.useCallback(() => {
    setSkipped(true);
    finish();
  }, [finish]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  const act = ACTS.find((a) => t >= a.at && t < a.until)?.key ?? (t >= TOTAL ? 'handoff' : 'void');
  const surge = act === 'ignition' ? 1 : act === 'spread' ? 0.72 : act === 'form' ? 0.42 : act === 'settle' ? 0.2 : 0.06;
  const intensity = Math.min(1, 0.1 + (t / TOTAL) * 1.05) * (act === 'handoff' ? 0.42 : 1);

  return (
    <div
      ref={wrapRef}
      onClick={skip}
      className="fixed inset-0 z-[200] cursor-pointer select-none overflow-hidden bg-[#060607]"
      style={{ animation: exiting ? 'ht-intro-out .52s cubic-bezier(.6,0,.2,1) forwards' : undefined }}
    >
      {/* live GPU field */}
      <div className="absolute inset-0" style={{ opacity: act === 'void' ? 0.35 : 1, transition: 'opacity 1.2s ease' }}>
        <HeatField intensity={intensity} surge={surge} flow={1.5} vignette={0.5} interactive={false} scale={0.8} paused={exiting} />
      </div>

      {/* radial bloom that punches through on ignition */}
      <AnimatePresence>
        {(act === 'ignition' || act === 'form') && (
          <motion.div
            key={act}
            aria-hidden
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.9, 0.35], scale: [0.35, 1.5, 1.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 0.9, 0.2, 1] }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div
              style={{
                width: 'min(70vw, 720px)',
                height: 'min(70vw, 720px)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,200,120,.5), rgba(255,92,10,.2) 40%, transparent 70%)',
                filter: 'blur(28px)',
                mixBlendMode: 'screen',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* act 3: diffusion graph — heat moving between nodes */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="node">
            <stop offset="0" stopColor="#FFF6DE" />
            <stop offset="0.45" stopColor="#FF8A1F" stopOpacity=".7" />
            <stop offset="1" stopColor="#FF2D12" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {act !== 'void' &&
          nodes.map((n, i) => {
            const local = Math.max(0, Math.min(1, (t - 2.8 - n.d) / 1.1));
            const next = nodes[(i + 7) % nodes.length];
            return (
              <g key={i} filter="url(#glow)">
                {local > 0.02 && (
                  <line
                    x1={n.x}
                    y1={n.y}
                    x2={n.x + (next.x - n.x) * local}
                    y2={n.y + (next.y - n.y) * local}
                    stroke="#FF6B1A"
                    strokeWidth={0.16}
                    strokeOpacity={0.5 * local}
                  />
                )}
                <circle cx={n.x} cy={n.y} r={0.5 + local * 1.5 * n.s} fill="url(#node)" opacity={0.25 + local * 0.75} />
              </g>
            );
          })}
      </svg>

      {/* typographic acts */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          {(act === 'void' || act === 'ignition') && (
            <motion.div key="open" exit={{ opacity: 0, y: -26, filter: 'blur(8px)' }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-4">
              <motion.span
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.1, ease: [0.16, 0.9, 0.2, 1] }}
                className="block h-[6px] w-[6px] rounded-full"
                style={{ background: '#FFF6DE', boxShadow: '0 0 34px 10px rgba(255,138,31,.85)' }}
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="max-w-[34ch] text-[13px] font-medium uppercase tracking-[0.4em] text-ink-dim"
              >
                Every feed is a lie about time
              </motion.p>
            </motion.div>
          )}

          {act === 'spread' && (
            <motion.div key="spread" initial="h" animate="v" exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }} transition={{ staggerChildren: 0.14, delayChildren: 0.05 }} className="flex flex-col items-center gap-3">
              {['Heat is injected', 'by attention', 'not by volume'].map((line, i) => (
                <motion.span
                  key={line}
                  variants={{ h: { opacity: 0, y: 22, filter: 'blur(10px)' }, v: { opacity: 1, y: 0, filter: 'blur(0px)' } }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={i === 1 ? 'ht-title text-[clamp(2rem,1.2rem+3.6vw,3.6rem)] text-white' : 'ht-title text-[clamp(1.5rem,1rem+2.4vw,2.4rem)] text-ink/45'}
                >
                  {line}
                </motion.span>
              ))}
            </motion.div>
          )}

          {(act === 'form' || act === 'settle' || act === 'handoff') && (
            <motion.div key="mark" className="flex flex-col items-center" initial={{ opacity: 0 }}>
              <Wordmark act={act} />
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 max-w-[46ch] text-[clamp(.95rem,.85rem+.4vw,1.15rem)] leading-relaxed text-ink-dim"
              >
                A spark and a 2,000-word essay in the same feed, ranked by one honest physics model —
                <span className="text-ink"> and you read everything here, never somewhere else.</span>
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.7 }}
                className="mt-7 flex flex-wrap items-center justify-center gap-2"
              >
                {['heat instead of likes', 'hold to ignite', 'no redirects', '$0 cold start'].map((chip) => (
                  <span key={chip} className="ht-chip !normal-case !tracking-[0.04em] !text-[11px]">
                    {chip}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* act labels + skip + progress */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="ht-label !tracking-[0.3em]">{act.toUpperCase()}</span>
          <span className="ht-num text-[11px] text-ink-faint">{Math.min(TOTAL, t).toFixed(1)}s / {TOTAL}s</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
          className="ht-btn ht-btn--ghost !text-[12px]"
        >
          Skip intro <span className="text-ink-faint">↵</span>
        </button>
      </div>

      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
        style={{ width: bar, background: 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare) 60%,var(--ht-whitehot))', boxShadow: '0 0 18px rgba(255,92,10,.9)' }}
      />

      {/* film letterbox for the first two seconds — cinematic, not a website */}
      <motion.div
        aria-hidden
        initial={{ height: '9vh' }}
        animate={{ height: t > 3 ? '0vh' : '9vh' }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-x-0 top-0 bg-[#060607]"
      />
      <motion.div
        aria-hidden
        initial={{ height: '9vh' }}
        animate={{ height: t > 3 ? '0vh' : '9vh' }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#060607]"
      />

      <style>{`
        @keyframes ht-intro-out{to{opacity:0;transform:scale(1.06);filter:blur(10px)}}
        @keyframes ht-mark-in{from{opacity:0;transform:translateY(26px) scale(.94);filter:blur(16px)}to{opacity:1;transform:none;filter:blur(0)}}
        @keyframes ht-mark-heat{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      `}</style>
    </div>
  );
}

/** The wordmark: molten gradient type with a heat sweep + ember sparks. */
function Wordmark({ act }: { act: string }) {
  return (
    <div className="relative">
      <h1
        className="ht-title ht-sweep ht-heat-text select-none text-[clamp(4.2rem,2rem+16vw,13rem)] leading-[0.82]"
        style={{
          animation: 'ht-mark-in 1.15s cubic-bezier(.16,.9,.2,1) both, ht-mark-heat 6s linear .6s infinite',
          backgroundSize: '200% 100%',
        }}
      >
        heatt
      </h1>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{
          background:
            act === 'form'
              ? 'radial-gradient(50% 60% at 50% 60%, rgba(255,92,10,.55), transparent 70%)'
              : 'radial-gradient(50% 60% at 50% 60%, rgba(255,92,10,.28), transparent 70%)',
          transition: 'background 1.2s ease',
        }}
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="ht-ember"
          style={
            {
              left: `${12 + i * 8}%`,
              bottom: '-10px',
              ['--dx' as string]: `${((i * 41) % 60) - 30}px`,
              ['--dy' as string]: `${-90 - ((i * 37) % 130)}px`,
              ['--d' as string]: `${1.8 + ((i * 13) % 12) / 10}s`,
              animationDelay: `${i * 0.28}s`,
              animationIterationCount: 'infinite',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
