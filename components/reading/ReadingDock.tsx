'use client';
/* ============================================================================
   components/reading/ReadingDock — reading progress, hovering over the app.

   Two pieces of chrome, nothing else:

     · a 2px rail at the very top of the viewport while a story is open, and
       a small floating pill that returns you to the story from anywhere;
     · a hairline progress pill that appears while you are reading.

   No receipts, no charts, no "you read 42 minutes this week". Progress belongs
   to the story, not to your record.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { unfinished } from '@/lib/feed';
import { EASE_IN, EASE_OUT } from '@/lib/motion';

/** Top rail, only while a story is open. */
export function ReadingRail() {
  const path = usePathnameSafe();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.4 });
  const opacity = useTransform(scrollYProgress, [0, 0.01, 0.99, 1], [0, 1, 1, 0.9]);
  if (!path.startsWith('/read/')) return null;
  return (
    <div className="ht-progress-rail" role="progressbar" aria-label="Reading progress">
      <motion.span className="ht-progress-rail__fill block" style={{ scaleX, opacity }} />
    </div>
  );
}

/** Floating pill: pick up the piece you left unfinished, from any screen. */
export function ReadingDock() {
  const app = useApp();
  const s = useStore();
  const path = usePathnameSafe();
  const [hidden, setHidden] = React.useState<string | null>(null);

  const current = React.useMemo(() => {
    const list = unfinished(app.posts, s as never);
    return list.find((x) => x.post.kind === 'forge') ?? null;
  }, [app.posts, s]);

  if (!current || path.startsWith('/read/') || hidden === String(current.post.id)) return null;
  const { post, pct } = current;
  const title = post.title ?? 'Untitled';
  const remaining = Math.max(1, Math.round((post.minutes ?? 6) * (1 - pct / 100)));

  return (
    <AnimatePresence>
      <motion.div
        key={String(post.id)}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 18, opacity: 0 }}
        transition={{ duration: 0.44, ease: EASE_OUT }}
        className="pointer-events-none fixed inset-x-0 bottom-[max(84px,calc(env(safe-area-inset-bottom)+84px))] z-[85] flex justify-center px-4"
      >
        <div className="ht-reading-pill pointer-events-auto">
          {post.cover ? (
            <img src={post.cover} alt="" className="ht-reading-pill__art" />
          ) : (
            <span className="ht-reading-pill__art grid place-items-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <path d="M5 4.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H5ZM19 4.5h-1.5A2.5 2.5 0 0 0 15 7v13a2.5 2.5 0 0 1 2.5-2.5H19Z" />
              </svg>
            </span>
          )}
          <span className="min-w-0 flex-1 pr-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ember-300">continue reading</span>
            <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink">{title}</span>
            <span className="mt-0.5 block text-[10.5px] text-ink-faint">
              {pct}% · {remaining} min left
            </span>
          </span>
          <button onClick={() => app.openPost(String(post.id))} className="ht-round ht-round--sm" aria-label={`Resume ${title}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
          <button
            onClick={() => setHidden(String(post.id))}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] text-ink-faint transition-colors hover:text-ink"
            aria-label="Hide reading progress"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="ht-reading-pill__bar" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function usePathnameSafe() {
  try {
    return usePathname() ?? '/';
  } catch {
    return '/';
  }
}

export { EASE_IN };
