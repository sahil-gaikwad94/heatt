'use client';
/* ============================================================================
   components/heat/Ignition — what happens when a piece reaches level 3.

   Two thousand milliseconds, once, and then nothing. A narrow band of light
   climbs from the bottom edge of the card (a low-resolution 1D field of
   turbulence, upscaled with a CSS blur so it reads as glow rather than
   blocks), a hairline of champagne travels the border, and it is over.

   The design rule this exists to serve: movement should be rare, big, and
   never repeat. There is no idle fire anywhere in the product.
   ==========================================================================*/

import * as React from 'react';
import { cls } from '@/lib/util';

export type IgnitionProps = {
  active: boolean;
  /** ms */
  duration?: number;
  /** 'full' lights the bottom band, 'subtle' is border only */
  variant?: 'full' | 'subtle';
  onDone?: () => void;
  className?: string;
};

const W = 88;
const H = 26;

export function FireOverlay({ active, duration = 2100, variant = 'full', onDone, className }: IgnitionProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;

  React.useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced =
      document.documentElement.dataset.reduceMotion === 'true' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;

    const img = ctx.createImageData(W, H);
    const field = new Float32Array(W * H);
    const prev = new Float32Array(W * H);
    const t0 = performance.now();
    let raf = 0;

    const paint = (t: number) => {
      /* envelope: ramp up fast, hold, fall away — one arc, no loop */
      const p = Math.min(1, t / duration);
      const env = p < 0.14 ? p / 0.14 : p > 0.62 ? Math.max(0, 1 - (p - 0.62) / 0.38) : 1;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          prev[i] = field[i];
          field[i] *= 0.965;
        }
      }
      /* turbulence injected at the bottom row, warm→white from bottom up */
      const speed = 0.9 + Math.sin(t / 260) * 0.25;
      for (let x = 0; x < W; x++) {
        const base = 0.55 + 0.45 * Math.sin((x / W) * Math.PI);
        const noise = 0.5 + 0.5 * Math.sin(x * 0.7 + t * 0.006 * speed);
        field[(H - 1) * W + x] = Math.min(1.4, base * noise * 1.15 + Math.random() * 0.22);
      }
      /* lateral diffusion + upward advection */
      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const below = field[(y + 1) * W + x];
          const l = field[y * W + Math.max(0, x - 1)];
          const r = field[y * W + Math.min(W - 1, x + 1)];
          field[i] = field[i] * 0.72 + below * 0.22 + (l + r) * 0.03;
        }
      }

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const v = Math.min(1, field[i] * env);
          const o = i * 4;
          /* champagne → warm white at the hottest cores */
          img.data[o] = 236 + v * 19;
          img.data[o + 1] = 211 + v * 40;
          img.data[o + 2] = 164 + v * 90;
          img.data[o + 3] = Math.round(232 * Math.pow(v, 1.35));
        }
      }
      ctx.putImageData(img, 0, 0);

      if (t < duration) raf = requestAnimationFrame(() => paint(performance.now() - t0));
      else doneRef.current?.();
    };

    if (reduced) {
      const t = window.setTimeout(() => doneRef.current?.(), 420);
      return () => window.clearTimeout(t);
    }
    raf = requestAnimationFrame(() => paint(0));
    return () => cancelAnimationFrame(raf);
  }, [active, duration]);

  if (!active) return null;

  return (
    <span aria-hidden className={cls('pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)}>
      <span
        className="absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: '0 0 0 1px rgba(232,211,164,.55), 0 22px 60px -24px rgba(232,211,164,.5)' }}
      />
      <span className="ht-shock absolute inset-0 rounded-[inherit]" />
      {variant === 'full' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-x-0 bottom-0 h-[46%] w-full"
          style={{ filter: 'blur(14px) saturate(140%)', mixBlendMode: 'screen', opacity: 0.9 }}
        />
      )}
    </span>
  );
}

/** Dust that lifts off a card the moment it ignites. Created imperatively. */
export function burstSparks(host: HTMLElement, origin: { x: number; y: number }, count = 12) {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.reduceMotion === 'true') return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'ht-spark';
    el.style.cssText = `left:${origin.x}px;top:${origin.y}px;--dx:${(Math.random() - 0.5) * 120}px;animation-delay:${(
      Math.random() * 0.3
    ).toFixed(2)}s;width:${2 + Math.random() * 3}px;height:${2 + Math.random() * 3}px`;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 2200);
  }
}
