'use client';
/* ============================================================================
   components/ui/primitives — the kit.

   Avatar · Modal · Toast · Meter · Kbd · Divider · Spinner · Stat · Chip ·
   Segmented · Empty. Every screen is assembled from these plus the .ht-*
   primitives in globals.css; nothing invents its own padding or colour.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { avatarDataUri, cls, compact, initialsOf } from '@/lib/util';
import { EASE, EASE_IN, EASE_OUT, overlay, sheet } from '@/lib/motion';

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  name,
  handle,
  src,
  size = 40,
  ring,
  className,
  alt,
}: {
  name: string;
  handle?: string;
  src?: string;
  size?: number;
  ring?: boolean;
  className?: string;
  alt?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const url = !src || broken ? avatarDataUri(name, handle ?? name) : src;
  const label = alt ?? name;
  return (
    <span
      className={cls('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', ring && 'ht-avatar-ring', className)}
      style={{ width: size, height: size, padding: ring ? 3 : 0 }}
    >
      <img
        src={url}
        alt={label}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="h-full w-full rounded-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

/* ------------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  children,
  label,
  align = 'center',
  bare,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  align?: 'center' | 'top';
  bare?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  /* remember who opened the dialog so focus can be handed back on close */
  const returnTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    returnTo.current = (document.activeElement as HTMLElement | null) ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (!nodes?.length) return;
      const list = [...nodes].filter((n) => n.offsetParent !== null || n === document.activeElement);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    /* scroll lock — compensate for the vanishing scrollbar so the page
       underneath does not jump sideways when the sheet opens or closes */
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    const t = window.setTimeout(() => {
      const target =
        ref.current?.querySelector<HTMLElement>('[data-autofocus]') ??
        ref.current?.querySelector<HTMLElement>('textarea,input,button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])');
      target?.focus?.();
      /* typing should land at the end of a restored draft */
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const n = target.value.length;
        try {
          target.setSelectionRange(n, n);
        } catch {/* some inputs disallow selection */}
      }
    }, 40);

    return () => {
      window.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      window.clearTimeout(t);
      /* hand focus back to the control that opened the dialog */
      const back = returnTo.current;
      if (back && document.contains(back)) back.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-center"
          style={{ alignItems: align === 'top' ? 'flex-start' : 'center', paddingTop: align === 'top' ? '12vh' : undefined }}
          variants={overlay}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <motion.button
            aria-label="Close"
            tabIndex={-1}
            onClick={onClose}
            className="ht-scrim absolute inset-0 z-0"
            style={{ position: 'absolute' }}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            variants={sheet}
            className={cls('relative z-10 mx-4 w-full pointer-events-auto', !bare && 'ht-modal')}
            style={{ maxWidth: 560 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------- Toast */

export function Toast({
  items,
  dismiss,
}: {
  items: { id: number; text: string; tone?: string; icon?: React.ReactNode; action?: { label: string; run: () => void } }[];
  dismiss: (id: number) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[max(96px,calc(env(safe-area-inset-bottom)+96px))] z-[120] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.34, ease: EASE_OUT }}
            className="ht-toast pointer-events-auto"
            data-tone={t.tone ?? 'plain'}
          >
            {t.icon}
            <span className="min-w-0">{t.text}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
                className="ht-toast__action"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="ht-toast__x" aria-label="Dismiss">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- small parts */

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ht-kbd">{children}</kbd>;
}

export function Divider({ className }: { className?: string }) {
  return <div aria-hidden className={cls('ht-hairline my-4', className)} />;
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full border-2 border-white/15 border-t-white/70"
      style={{ width: size, height: size }}
    />
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cls('ht-meter block', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Stat({ k, v, onClick }: { k: string; v: number | string; onClick?: () => void }) {
  const body = (
    <>
      <span className="ht-stat-v">{typeof v === 'number' ? compact(v) : v}</span>
      <span className="ht-stat-k">{k}</span>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="ht-stat">
      {body}
    </button>
  ) : (
    <div className="ht-stat">{body}</div>
  );
}

export function Chip({
  children,
  tone = 'plain',
  onClick,
  className,
  as = 'span',
  href,
}: {
  children: React.ReactNode;
  tone?: 'plain' | 'heat' | 'gold' | 'iris';
  onClick?: () => void;
  className?: string;
  as?: 'span' | 'button' | 'a';
  href?: string;
}) {
  const cls2 = cls('ht-chip', tone === 'heat' && 'ht-chip--heat', (tone === 'gold' || tone === 'iris') && 'ht-chip--gold', className);
  if (as === 'a' && href)
    return (
      <a href={href} className={cls2} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  if (onClick)
    return (
      <button onClick={onClick} className={cls2}>
        {children}
      </button>
    );
  return <span className={cls2}>{children}</span>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cls('ht-tabrail', className)} role="tablist" aria-label={label}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className="ht-tab"
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-white/[.08]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ht-panel flex flex-col items-start gap-3 p-6">
      <span className="ht-eyebrow ht-eyebrow--plain">nothing here yet</span>
      <h2 className="ht-title text-[19px]">{title}</h2>
      <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-ink-mute">{body}</p>
      {action}
    </div>
  );
}

/** Initials tile used when an image is missing — never a broken icon. */
export function Monogram({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cls('grid shrink-0 place-items-center rounded-md border border-line bg-white/[.03] font-bold text-ink-2', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initialsOf(name).toUpperCase()}
    </span>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_IN } },
};
