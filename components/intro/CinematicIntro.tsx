'use client';
/* ============================================================================
   components/intro/CinematicIntro — four seconds, three acts, one canvas.

     ACT I   VOID      a single point of light ignites in the middle of nothing
     ACT II  SIGNAL    it opens: rings of light spread, the room pulls back
     ACT III HANDOFF   the wordmark resolves and the plate dissolves into the app

   Everything is drawn on one canvas at half resolution with additive blending,
   so the whole sequence costs a handful of milliseconds a frame. It is skipped
   by one click or any key, and it never runs for a returning reader.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion';

const ACTS = ['VOID', 'SIGNAL', 'HANDOFF'] as const;
const DURATION = 4200;

export function CinematicIntro({ onDone, done }: { onDone: () => void; done?: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [act, setAct] = React.useState(0);
  const [closing, setClosing] = React.useState(false);
  const finished = React.useRef(false);

  const finish = React.useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setClosing(true);
    window.setTimeout(onDone, 620);
  }, [onDone]);

  /* any key, any click, anywhere */
  React.useEffect(() => {
    const key = () => finish();
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', key);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', key);
    };
  }, [finish]);

  React.useEffect(() => {
    const t = window.setTimeout(finish, DURATION);
    return () => window.clearTimeout(t);
  }, [finish]);

  /* ------------------------------------------------------------- the plate */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced =
      document.documentElement.dataset.reduceMotion === 'true' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(1, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = Math.floor((canvas.clientWidth || window.innerWidth) * 0.5 * dpr);
      H = Math.floor((canvas.clientHeight || window.innerHeight) * 0.5 * dpr);
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 110 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.1 + Math.random() * 0.9,
      s: 0.2 + Math.random() * 0.6,
      z: 0.3 + Math.random() * 0.7,
    }));

    const t0 = performance.now();
    let raf = 0;
    let lastAct = -1;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const p = Math.min(1, (now - t0) / DURATION);
      const nextAct = p < 0.3 ? 0 : p < 0.68 ? 1 : 2;
      if (nextAct !== lastAct) {
        lastAct = nextAct;
        setAct(nextAct);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      const cx = W / 2;
      const cy = H / 2;
      const ignition = Math.min(1, t / 0.85);
      const spread = Math.max(0, Math.min(1, (t - 0.85) / 1.9));
      const settle = Math.max(0, Math.min(1, (t - 2.5) / 1.4));

      /* the core: a point that becomes a sun and then calms into a horizon */
      const coreR = (10 + ignition * 34 + spread * 120 - settle * 96) * dpr;
      const coreA = (ignition * (1 - settle * 0.75)) * (1 - spread * 0.25);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(6, coreR));
      g.addColorStop(0, `rgba(255,250,238,${(0.95 * coreA).toFixed(3)})`);
      g.addColorStop(0.22, `rgba(232,211,164,${(0.6 * coreA).toFixed(3)})`);
      g.addColorStop(0.6, `rgba(107,162,255,${(0.16 * coreA).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(6, coreR), 0, Math.PI * 2);
      ctx.fill();

      /* rings: light arriving from further and further away */
      if (spread > 0) {
        for (let i = 0; i < 5; i++) {
          const phase = (spread * 1.35 - i * 0.16) % 1;
          if (phase <= 0) continue;
          const r = Math.pow(phase, 1.6) * Math.max(W, H) * 0.72;
          const a = (1 - phase) * 0.16 * (1 - settle * 0.6);
          ctx.strokeStyle = i % 2 === 0 ? `rgba(232,211,164,${a.toFixed(3)})` : `rgba(107,162,255,${a.toFixed(3)})`;
          ctx.lineWidth = (1.4 - phase) * dpr * 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      /* dust: it drifts outward as the room opens up */
      for (const s of stars) {
        const dist = (0.12 + s.r) * Math.max(W, H) * (0.12 + spread * 0.55) * s.z;
        const x = cx + Math.cos(s.a) * dist;
        const y = cy + Math.sin(s.a) * dist * 0.82;
        const a = Math.min(0.7, ignition * 0.5) * (1 - settle * 0.8) * s.s;
        ctx.fillStyle = `rgba(255,247,232,${a.toFixed(3)})`;
        ctx.fillRect(x, y, 1.4 * dpr, 1.4 * dpr);
      }

      /* a horizon line that grounds the end of the sequence */
      if (settle > 0) {
        const ly = cy + 2 * dpr;
        const lg = ctx.createLinearGradient(cx - W * 0.5, 0, cx + W * 0.5, 0);
        lg.addColorStop(0, 'rgba(0,0,0,0)');
        lg.addColorStop(0.5, `rgba(232,211,164,${(0.5 * settle).toFixed(3)})`);
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(cx - W * 0.5, ly, W, 1.2 * dpr);
      }

      ctx.globalCompositeOperation = 'source-over';
      if (p < 1) raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      const t = window.setTimeout(() => setAct(2), 400);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('resize', resize);
      };
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const word = 'heatt';

  return (
    <AnimatePresence>
      <motion.div
        className="ht-intro"
        initial={{ opacity: 1 }}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: closing ? 0.6 : 0.3, ease: EASE_OUT }}
        role="dialog"
        aria-label="heatt intro"
      >
        <canvas ref={canvasRef} className="ht-intro__canvas" aria-hidden />

        {/* letterbox bars pull open as the plate hands over */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 z-[2] bg-black"
          style={{ height: closing ? 0 : 56, transition: 'height 900ms cubic-bezier(.16,1,.3,1)' }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[2] bg-black"
          style={{ height: closing ? 0 : 56, transition: 'height 900ms cubic-bezier(.16,1,.3,1)' }}
        />

        <div className="ht-intro__word">
          <h1 className="ht-metal-text" aria-label={word}>
            <span className="sr-only">{word}</span>
            <span aria-hidden className="flex justify-center">
              {word.split('').map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  initial={{ opacity: 0, y: 26, filter: 'blur(14px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.1, delay: 1.75 + i * 0.09, ease: EASE_OUT }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 2.35, ease: EASE_OUT }}
          >
            a room for things that stay with you
          </motion.p>
        </div>

        <div className="ht-intro__acts" aria-hidden>
          {ACTS.map((a, i) => (
            <React.Fragment key={a}>
              <span className="ht-intro__tick">
                <motion.i
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i < act ? 1 : i === act ? 0.5 : 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                />
              </span>
              <span className={`text-[9.5px] font-bold uppercase tracking-[0.28em] ${i === act ? 'text-ink-2' : 'text-ink-4'}`}>{a}</span>
            </React.Fragment>
          ))}
        </div>

        <button onClick={finish} className="ht-intro__skip">
          Skip
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
