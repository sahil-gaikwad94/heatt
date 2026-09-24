'use client';
/* ============================================================================
   lib/scroll.ts — remember where the reader was.

   The board is long. Opening a story and coming back should not dump you at
   the top of it — that is the single most common way an app feels cheap.

   Positions live in sessionStorage (per tab, per surface): the board keeps
   its place, and a story keeps its own place even if the reader's stored
   percentage is unavailable.
   ==========================================================================*/

import * as React from 'react';

const KEY = 'heatt-scroll-v1';
const MIN = 60; /* below this, starting at the top is what people expect */

type Book = Record<string, number>;

function read(): Book {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Book) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(book: Book) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(book));
  } catch {/* private mode, quota — scrolling still works */}
}

/**
 * Restores the saved position once the surface is tall enough to hold it,
 * then keeps it up to date while you scroll.
 */
export function useScrollMemory(id: string) {
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) return;
    const saved = read()[id] ?? 0;
    if (saved < MIN) {
      done.current = true;
      return;
    }
    let tries = 0;
    let raf = 0;
    let settle = 0;
    /* next.js restores its own scroll on history nav — correct it after */
    const start = () => {
      const tick = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max >= saved - 8 || tries > 50) {
          window.scrollTo({ top: Math.max(0, Math.min(saved, max)), behavior: 'auto' });
          done.current = true;
          return;
        }
        tries += 1;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    settle = window.setTimeout(start, 90);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, [id]);

  React.useEffect(() => {
    let raf = 0;
    let save = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        window.clearTimeout(save);
        save = window.setTimeout(() => {
          const book = read();
          if (y < MIN) delete book[id];
          else book[id] = Math.round(y);
          write(book);
        }, 220);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(save);
    };
  }, [id]);
}

/** Forget one surface's position (used when the list under it is replaced). */
export function forgetScroll(id: string) {
  const book = read();
  if (id in book) {
    delete book[id];
    write(book);
  }
}
