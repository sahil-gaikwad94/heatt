'use client';
/* ============================================================================
   components/onboarding/Onboarding — four scenes, no form.

   "Chase your curiosity" is the whole onboarding. Each scene is a full-bleed
   plate with type over it and a *live demonstration* underneath — never a
   screenshot:

     01  the room      cards arrive out of the dark
     02  the reader    a story fills with ink, the rail creeps forward
     03  the heat      the control charges to ignition and throws sparks
     04  the share     a poster assembles frame by frame

   It asks for nothing. No handle, no bio, no photo, no interests. Identities
   are minted later, inside the app, when you actually need one.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { EASE_IN, EASE_OUT } from '@/lib/motion';
import { WordReveal } from '@/components/ui/motion';

const SCENES = [
  {
    id: 'room',
    eyebrow: 'scene one — the room',
    title: 'Chase your',
    accent: 'curiosity',
    body: 'A black room with no scoreboard in it. Stories from the house, from real writers on the wire, and from you — nothing invented, nothing ranked against each other.',
    art: '/art/obsidian-atelier.jpg',
  },
  {
    id: 'reader',
    eyebrow: 'scene two — the reading',
    title: 'Stay with what',
    accent: 'holds you',
    body: 'Long pieces open in the same room: no redirect, no cookie wall, no layout shifting under your eyes. A two-pixel rail keeps your place and a small pill hands it back.',
    art: '/art/deep-read.jpg',
  },
  {
    id: 'heat',
    eyebrow: 'scene three — the gesture',
    title: 'Give it',
    accent: 'heat',
    body: 'Tap to warm something. Hold, and it goes up. Hold longer and it ignites and moves on the board. That is the entire engagement model — one gesture, and it means what you decide it means.',
    art: '/art/quiet-kiln.jpg',
  },
  {
    id: 'share',
    eyebrow: 'scene four — the sending',
    title: 'Send the',
    accent: 'feeling',
    body: 'Turn a line into a poster at real export size, or send the whole piece as a link that reads beautifully anywhere. A share should look like something you would actually send someone.',
    art: '/art/story-canvas.jpg',
  },
] as const;

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const [i, setI] = React.useState(0);
  const [leaving, setLeaving] = React.useState(false);
  const doneRef = React.useRef(false);

  const finish = React.useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    useStore.getState().completeOnboarding(['design', 'reading', 'craft']);
    window.setTimeout(() => {
      onDone?.();
    }, 520);
  }, [onDone]);

  /* auto-advance: 8s a scene, paused on the last one */
  React.useEffect(() => {
    if (i >= SCENES.length - 1) return;
    const t = window.setTimeout(() => setI((n) => Math.min(SCENES.length - 1, n + 1)), 8000);
    return () => window.clearTimeout(t);
  }, [i]);

  /* keyboard: → advances, ↵ enters on the last scene, esc skips out */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(SCENES.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (i === SCENES.length - 1) finish();
        else setI((n) => n + 1);
      }
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, finish]);

  const scene = SCENES[i];
  const last = i === SCENES.length - 1;

  return (
    <motion.div
      className="ht-onb"
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 0.5 : 0.6, ease: EASE_OUT }}
      role="dialog"
      aria-label="heatt tour"
    >
      {/* ------------------------------------------------------------- plate */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <AnimatePresence initial={false}>
          <motion.div
            key={scene.art}
            className="ht-onb__plate"
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 1.6, ease: EASE_OUT }}
          >
            <motion.img
              src={scene.art}
              alt=""
              className="h-full w-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 9, ease: 'linear' }}
            />
          </motion.div>
        </AnimatePresence>
        <div className="ht-onb__scrim" />
      </div>

      {/* ---------------------------------------------------------- segments */}
      <div className="ht-onb__segments" role="tablist" aria-label="Scenes">
        {SCENES.map((s, n) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={n === i}
            aria-label={s.eyebrow}
            onClick={() => setI(n)}
            className="ht-onb__segment"
          >
            {n < i && <i style={{ transform: 'scaleX(1)' }} />}
            {n === i && (
              <motion.i
                key={`p-${i}`}
                style={{ originX: 0 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: last ? 1 : 1 }}
                transition={{ duration: last ? 0.8 : 8, ease: 'linear' }}
              />
            )}
          </button>
        ))}
      </div>

      <button onClick={finish} className="ht-intro__skip" style={{ top: 'max(52px, calc(env(safe-area-inset-top) + 44px))' }}>
        Skip
      </button>

      {/* ----------------------------------------------------------- content */}
      <div className="ht-onb__content">
        <div className="ht-onb__stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="grid w-full place-items-center"
            >
              <Demo id={scene.id} />
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${scene.id}-copy`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <span className="ht-eyebrow">{scene.eyebrow}</span>
            <h2 className="mt-3">
              <WordReveal text={scene.title} each={0.055} />
              <br />
              <em>
                <WordReveal text={scene.accent} delay={0.18} each={0.055} />
              </em>
            </h2>
            <p className="ht-onb__body">{scene.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="ht-onb__nav">
          <div className="ht-onb__beat" aria-hidden>
            {SCENES.map((s, n) => (
              <i key={s.id} data-on={n === i ? 'true' : 'false'} />
            ))}
          </div>
          <span className="flex-1" />
          {i > 0 && (
            <button onClick={() => setI((n) => n - 1)} className="ht-icon-btn" aria-label="Previous scene">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {last ? (
            <SwipeToStart label="Swipe to start" onDone={finish} />
          ) : (
            <button onClick={() => setI((n) => n + 1)} className="ht-btn ht-btn--heat !h-[46px] !px-6">
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================== the demos ============================== */

function Demo({ id }: { id: string }) {
  if (id === 'room') return <RoomDemo />;
  if (id === 'reader') return <ReaderDemo />;
  if (id === 'heat') return <HeatDemo />;
  return <ShareDemo />;
}

/** 01 — cards arriving out of the dark, one after another. */
function RoomDemo() {
  const rows = [
    { t: 'A room, not a feed', m: '8 min read' },
    { t: 'Heat, without the physics', m: '7 min read' },
    { t: 'Designing black', m: '9 min read' },
  ];
  return (
    <div className="w-[min(400px,86vw)] space-y-2.5">
      {rows.map((r, i) => (
        <motion.div
          key={r.t}
          initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.15 + i * 0.22, ease: EASE_OUT }}
          className="flex items-center gap-3 rounded-[var(--r-md)] border border-line-2 bg-white/[.035] p-3 backdrop-blur-md"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7ead0] to-[#b99f6c] text-[13px] font-bold text-[#241a06]">
            h
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">{r.t}</span>
            <span className="block text-[11px] text-ink-3">{r.m} · heatt</span>
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#6BA2FF]" style={{ boxShadow: '0 0 10px #6BA2FF' }} />
        </motion.div>
      ))}
    </div>
  );
}

/** 02 — a story filling with ink while the progress rail creeps forward. */
function ReaderDemo() {
  const lines = [96, 88, 100, 74, 92, 60];
  return (
    <div className="ht-demo !w-[min(420px,86vw)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="ht-label !text-[9px]">reading</span>
        <span className="ht-num text-[10.5px] text-ember-300">62%</span>
      </div>
      <div className="mb-3 h-[2px] overflow-hidden rounded-full bg-white/10">
        <motion.i
          className="block h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#E8D3A4,#FFF8E6)' }}
          initial={{ width: '4%' }}
          animate={{ width: '62%' }}
          transition={{ duration: 4.4, ease: EASE_OUT }}
        />
      </div>
      <div className="space-y-2.5">
        {lines.map((w, i) => (
          <motion.span
            key={i}
            className="block h-[7px] rounded-full bg-white/12"
            style={{ width: `${w}%` }}
            initial={{ opacity: 0, scaleX: 0.2, originX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.2 + i * 0.16, ease: EASE_OUT }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="ht-chip ht-chip--heat !h-[24px]">heated</span>
        <span className="text-[11px] text-ink-4">tap and hold to raise the heat</span>
      </div>
    </div>
  );
}

/** 03 — the control charging from quiet to ignition. */
function HeatDemo() {
  const [level, setLevel] = React.useState(1);
  React.useEffect(() => {
    let n = 1;
    const id = window.setInterval(() => {
      n = n >= 3 ? 1 : n + 1;
      setLevel(n);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);
  const sparks = level === 3;
  return (
    <div className="grid place-items-center gap-4">
      <div className="relative">
        <motion.span
          aria-hidden
          className="absolute -inset-8 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,211,164,.35), transparent 70%)', filter: 'blur(18px)' }}
          animate={{ opacity: level === 3 ? [0, 0.9, 0] : level * 0.16 }}
          transition={{ duration: level === 3 ? 1.4 : 0.5 }}
        />
        <span
          className="relative grid h-[92px] w-[92px] place-items-center rounded-full border text-[13px] font-semibold"
          style={{
            borderColor: level === 3 ? 'rgba(232,211,164,.75)' : level === 2 ? 'rgba(232,211,164,.5)' : 'rgba(232,211,164,.3)',
            background: `rgba(232,211,164,${0.06 + level * 0.05})`,
            color: '#F7EAD0',
            boxShadow: level === 3 ? '0 0 34px -6px rgba(232,211,164,.8)' : undefined,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M12 2.6c2.2 4.1.5 6-1.4 7.8C8.6 12.2 7 13.6 7 16.2A5 5 0 0 0 12 21a5 5 0 0 0 5-4.8c0-2.3-1.1-4-2.9-5.9 1.9 2 2.8 4 2.8 6.2"
              fill={level >= 2 ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {sparks &&
            Array.from({ length: 8 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-[#F7EAD0]"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], x: Math.cos((i / 8) * Math.PI * 2) * 70, y: -30 - (i % 3) * 26 }}
                transition={{ duration: 1.3, ease: EASE_OUT }}
              />
            ))}
        </span>
      </div>
      <div className="text-center">
        <p className="ht-num text-[15px] font-semibold text-[#F7EAD0]">
          {level === 1 ? 'heated' : level === 2 ? 'blazing' : 'ignited'}
        </p>
        <p className="mt-1 text-[11.5px] text-ink-3">
          {level === 3 ? 'the piece moves up the board' : 'keep holding…'}
        </p>
      </div>
    </div>
  );
}

/** 04 — three poster frames assembling. */
function ShareDemo() {
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => (f + 1) % 3), 2200);
    return () => window.clearInterval(id);
  }, []);
  const labels = ['Cover', 'The line', 'Signature'];
  return (
    <div className="flex items-end justify-center gap-2.5">
      {[0, 1, 2].map((n) => (
        <motion.div
          key={n}
          className="relative overflow-hidden rounded-[var(--r-md)] border"
          style={{
            width: n === 1 ? 'min(180px,42vw)' : 'min(120px,30vw)',
            aspectRatio: '9/16',
            borderColor: n === frame ? 'rgba(232,211,164,.6)' : 'var(--line)',
            background:
              n === 0
                ? 'linear-gradient(160deg,#2b2416,#0a0a0c)'
                : n === 1
                  ? 'linear-gradient(160deg,#16233c,#08090c)'
                  : 'linear-gradient(160deg,#1c1c22,#08090c)',
          }}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0, scale: n === frame ? 1.03 : 1 }}
          transition={{ duration: 0.7, delay: n * 0.12, ease: EASE_OUT }}
        >
          <span className="absolute inset-x-3 top-3 text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/45">
            {labels[n]}
          </span>
          <span className="absolute inset-x-3 bottom-3">
            <span className="block h-[6px] w-[86%] rounded-full bg-white/22" />
            <span className="mt-1.5 block h-[6px] w-[58%] rounded-full bg-white/14" />
            <span className="mt-3 block text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#E8D3A4]">
              heatt / {n + 1}
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ swipe control */

function SwipeToStart({ label, onDone }: { label: string; onDone: () => void }) {
  const [x, setX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const wrap = React.useRef<HTMLDivElement | null>(null);
  const start = React.useRef(0);

  const width = () => (wrap.current?.offsetWidth ?? 300) - 74;

  const end = (clientX: number) => {
    setDragging(false);
    const travelled = x;
    if (travelled > width() * 0.62) {
      setX(width());
      window.setTimeout(onDone, 180);
      return;
    }
    setX(0);
    void clientX;
  };

  return (
    <div ref={wrap} className="relative flex-1">
      <div
        className="ht-swipe ht-swipe--onb"
        style={{ height: 58 }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') return;
          setDragging(true);
          start.current = e.clientX - x;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setX(Math.max(0, Math.min(width(), e.clientX - start.current)));
        }}
        onPointerUp={() => end(0)}
        onPointerCancel={() => end(0)}
      >
        <span className="ht-swipe-fill" style={{ transform: `scaleX(${(x / Math.max(1, width())).toFixed(3)})` }} />
        <span className="ht-swipe-sheen" aria-hidden />
        <span className="relative z-[1] flex-1 pl-1 text-[15px]">{label}</span>
        <button
          onClick={onDone}
          className="ht-round relative z-[1]"
          aria-label="Enter heatt"
          data-testid="swipe-knob"
          onPointerDown={(e) => {
            setDragging(true);
            start.current = e.clientX - x;
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            setX(Math.max(0, Math.min(width(), e.clientX - start.current)));
          }}
          onPointerUp={() => end(0)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { EASE_IN };
