'use client';
/* ============================================================================
   components/heat/HeatButton — the core interaction.

     tap            → heated          (tap again to take the heat back)
     hold 1.0s      → blazing
     hold 2.2s      → ignited         (commits immediately, plus a spark burst)
     release early  → commits whatever level was reached, never overshoots
     scroll intent  → 24px of movement cancels the clock

   Progress is drawn with a conic gradient (GPU, no layout). Haptics mark each
   threshold where the device supports it, and the control is fully keyboard
   operable: Enter/Space taps, holding Space climbs.
   ==========================================================================*/

import * as React from 'react';
import { HOLD_MS, LEVEL_META } from '@/lib/heat';
import { originInside } from '@/components/heat/FireOverlay';
import type { HeatLevel } from '@/lib/types';
import { cls, compact } from '@/lib/util';

export type HeatButtonProps = {
  level: HeatLevel;
  count: number;
  onChange: (level: HeatLevel, meta: { ignited: boolean }) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  label?: string;
  className?: string;
  /** renders the heat value as the "heat" number of the piece */
  heat?: number;
};

const RING = 2;
const SIZE = {
  sm: { h: 30, pad: '0 10px 0 8px', icon: 14, font: 12, gap: 6 },
  md: { h: 36, pad: '0 13px 0 11px', icon: 16, font: 13, gap: 7 },
  lg: { h: 46, pad: '0 18px 0 15px', icon: 20, font: 14.5, gap: 9 },
} as const;

export function HeatButton({
  level,
  count,
  onChange,
  size = 'md',
  showCount = true,
  label,
  className,
  heat,
}: HeatButtonProps) {
  const [hold, setHold] = React.useState(0);
  const [preview, setPreview] = React.useState<HeatLevel>(0);
  const raf = React.useRef(0);
  const started = React.useRef(0);
  const moved = React.useRef(false);
  const origin = React.useRef<{ x: number; y: number } | null>(null);
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const s = SIZE[size];

  const buzz = React.useCallback((pattern: number | number[]) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }, []);

  const stopClock = React.useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  const burst = React.useCallback(() => {
    const el = ref.current;
    if (!el || document.documentElement.dataset.reduceMotion === 'true') return;
    const host = el.parentElement;
    if (!host) return;
    /* rects, not offsets: the spark shower must land on the control no matter
       what the button's offsetParent happens to be */
    for (let i = 0; i < 10; i++) {
      const { x, y } = originInside(host, el, 4);
      const e = document.createElement('span');
      e.className = 'ht-spark';
      e.style.cssText = `left:${x + (Math.random() - 0.5) * 14}px;top:${y}px;--dx:${
        (Math.random() - 0.5) * 80
      }px;animation-delay:${(Math.random() * 0.25).toFixed(2)}s`;
      host.appendChild(e);
      window.setTimeout(() => e.remove(), 2200);
    }
  }, []);

  const tick = React.useCallback(() => {
    const t = performance.now() - started.current;
    setHold(Math.min(1, t / HOLD_MS[3]));
    const want: HeatLevel = t >= HOLD_MS[3] ? 3 : t >= HOLD_MS[2] ? 2 : 1;
    if (want !== preview) {
      setPreview(want);
      buzz(want === 3 ? [14, 24, 40] : want === 2 ? 12 : 6);
      if (want === 3) {
        onChange(3, { ignited: true });
        stopClock();
        setHold(0);
        setPreview(0);
        burst();
      }
    }
    if (t < HOLD_MS[3]) raf.current = requestAnimationFrame(tick);
  }, [buzz, burst, onChange, preview, stopClock]);

  const begin = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    moved.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    started.current = performance.now();
    setPreview(0);
    stopClock();
    raf.current = requestAnimationFrame(tick);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!origin.current) return;
    if (Math.abs(e.clientX - origin.current.x) > 24 || Math.abs(e.clientY - origin.current.y) > 24) {
      moved.current = true;
      cancel();
    }
  };

  const cancel = () => {
    stopClock();
    setHold(0);
    setPreview(0);
    origin.current = null;
  };

  const end = () => {
    if (!origin.current && !moved.current) return;
    const held = performance.now() - started.current;
    stopClock();
    origin.current = null;
    if (moved.current) {
      moved.current = false;
      return; // the gesture was a scroll, not heat
    }
    if (held >= HOLD_MS[2]) {
      onChange(Math.max(2, level) as HeatLevel, { ignited: held >= HOLD_MS[3] });
    } else if (held >= HOLD_MS[1] && held > 220) {
      onChange(1, { ignited: false });
    } else {
      onChange((level > 0 ? 0 : 1) as HeatLevel, { ignited: false });
    }
    setHold(0);
    setPreview(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    started.current = performance.now();
    setPreview(0);
    raf.current = requestAnimationFrame(tick);
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    end();
  };

  const shown: HeatLevel = hold > 0.02 ? (preview || 1) : level;
  const meta = LEVEL_META[shown];
  const r = s.h / 2;
  const pct = hold > 0 ? hold : shown > 0 ? 1 : 0;
  const degrees = Math.round(pct * 360);

  return (
    <button
      ref={ref}
      type="button"
      className={cls('ht-heat-btn', className)}
      data-level={shown}
      data-holding={hold > 0.02 ? 'true' : 'false'}
      style={{ height: s.h, padding: s.pad, fontSize: s.font, gap: s.gap }}
      aria-label={label ?? `${meta.name}. Hold to raise the heat.`}
      aria-pressed={level > 0}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden className="ht-heat-ring" style={{ opacity: shown > 0 || hold > 0 ? 1 : 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect
            x={RING / 2}
            y={RING / 2}
            width={100 - RING}
            height={100 - RING}
            rx={r}
            fill="none"
            stroke={meta.ring}
            strokeWidth={RING}
            strokeDasharray={`${degrees} 360`}
            pathLength={360}
            style={{ transition: hold > 0 ? 'none' : 'stroke-dasharray 320ms cubic-bezier(.22,1,.36,1)' }}
          />
        </svg>
      </span>
      <FlameGlyph filled={shown > 0} />
      {showCount && <span className="ht-num relative">{compact(count)}</span>}
      {heat !== undefined && <span className="ht-ink-3 relative hidden text-[11px] sm:inline">{heat}°</span>}
    </button>
  );
}

function FlameGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="relative shrink-0">
      <path
        d="M12 2.6c2.2 4.1.5 6-1.4 7.8C8.6 12.2 7 13.6 7 16.2A5 5 0 0 0 12 21a5 5 0 0 0 5-4.8c0-2.3-1.1-4-2.9-5.9 1.9 2 2.8 4 2.8 6.2"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.9}
      />
    </svg>
  );
}
