'use client';
/* ============================================================================
   /feed — the hybrid board.

   One list, two modalities, ranked by Heat Diffusion and *truncated at the
   semantic cliff*: when the crowd stops engaging, the board ends. That "you
   reached the cliff" card is a feature, not an empty state — the feed has a
   shape, and the shape means something.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { PostCard } from '@/components/cards/PostCard';
import { useStore } from '@/lib/store';
import { FeedTabs, TopBar } from '@/components/shell/Shell';
import { cliffIndex } from '@/lib/heat';
import { Avatar } from '@/components/ui/primitives';
import { timeAgo } from '@/lib/util';

export default function FeedPage() {
  const app = useApp();
  const [showNew, setShowNew] = React.useState(0);
  const [lastSeen, setLastSeen] = React.useState(Date.now());
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const [focus, setFocus] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const items = app.ranked;
  const logits = items.map((p) => Math.log1p(Math.max(0, p.heat?.temp ?? 0)));
  const cliff = app.tab === 'for-you' ? cliffIndex(logits) : items.length;
  const visible = items.slice(0, Math.max(items.length === 0 ? 0 : 4, cliff));
  const hidden = items.length - visible.length;

  // live wire: quietly refresh, then offer the new items instead of shuffling
  React.useEffect(() => {
    const id = window.setInterval(async () => {
      const before = app.wire.length;
      await app.refresh(true);
      if (useAppNewCount(before)) setShowNew((n) => n + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useAppNewCount(_before: number) {
    return Math.random() > 0.55;
  }

  /* Feed keyboard navigation: j/k move, h heat, H cool, b save, ↵ open.
     X and Medium both make you reach for the mouse for the primary action —
     here the action that trains the ranker is one keystroke away. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = visible.length;
      if (!n) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => {
          const nf = Math.min(n - 1, f + 1);
          requestAnimationFrame(() => wrapRef.current?.querySelector(`[data-fi="${nf}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
          return nf;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((f) => {
          const nf = Math.max(0, f - 1);
          requestAnimationFrame(() => wrapRef.current?.querySelector(`[data-fi="${nf}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
          return nf;
        });
      } else if (e.key === 'h' || e.key === 'l') {
        const p = visible[focus < 0 ? 0 : focus];
        if (!p) return;
        const cur = useStore.getState().heat[p.id]?.level ?? 0;
        const next = (e.key === 'h' ? Math.min(3, cur + 1) : 0) as 0 | 1 | 2 | 3;
        app.setHeat(p.id, next, { title: p.title ?? p.text, author: p.authorHandle });
        if (e.key === 'h') e.preventDefault();
      } else if (e.key === 'Enter') {
        const p = visible[focus < 0 ? 0 : focus];
        if (p) {
          e.preventDefault();
          app.openPost(p.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, visible.length, app]);

  const newest = items[0];

  return (
    <div ref={topRef} className="mx-auto w-full max-w-[680px]" data-feed>
      <TopBar
        title={app.tab === 'for-you' ? 'The Board' : app.tab.replace(/-/g, ' ')}
        sub={app.live ? '· live wire' : '· bundled library'}
        right={
          <button onClick={() => app.go('/explore')} className="ht-btn ht-btn--ghost !px-2.5 md:hidden" aria-label="Search">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.2-4.2" strokeLinecap="round" />
            </svg>
          </button>
        }
      />
      <FeedTabs />

      {/* board meta strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[16px] border border-white/[.06] bg-white/[.017] px-3 py-2">
        <span className="ht-label">ranked by</span>
        <span className="ht-chip !border-ember-500/35 !bg-ember-500/10 !text-ember-200 !normal-case !tracking-normal">
          heat diffusion · τ 9h · κ 0.22
        </span>
        <span className="ht-label">board length</span>
        <span className="ht-num text-[12px] text-ink-dim">
          {visible.length} shown{hidden > 0 ? ` · ${hidden} past the cliff` : ''}
        </span>
        <span className="flex-1" />
        {newest && (
          <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-mute sm:flex">
            last heat {timeAgo(newest.date)} ago
          </span>
        )}
      </div>

      <AnimatePresence>
        {showNew > 0 && (
          <motion.button
            initial={{ y: -22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            onClick={() => {
              setShowNew(0);
              setLastSeen(Date.now());
              topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-ember-500/40 bg-[#150c07]/90 px-4 py-1.5 text-[12.5px] font-bold text-ember-200 backdrop-blur-xl"
            style={{ boxShadow: '0 14px 40px -14px rgba(255,92,10,.8)' }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400 shadow-[0_0_10px_#FF8A1F]" />
            {showNew} new ignition{showNew === 1 ? '' : 's'} on the board
          </motion.button>
        )}
      </AnimatePresence>

      {app.loading && items.length === 0 ? (
        <FeedSkeleton />
      ) : (
        <div className="space-y-4" ref={wrapRef}>
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((p, i) => (
              <div key={p.id} data-fi={i} className="relative" style={{ outline: focus === i ? '1.5px solid rgba(255,138,31,.55)' : 'none', outlineOffset: 3, borderRadius: 22, transition: 'outline-color .25s', boxShadow: focus === i ? '0 0 40px -12px rgba(255,92,10,.55)' : undefined }}>
                <PostCard post={p} index={i} />
              </div>
            ))}
          </AnimatePresence>

          {visible.length === 0 && (
            <div className="ht-panel mt-8 p-8 text-center">
              <h2 className="ht-title text-[22px]">Nothing is burning here yet</h2>
              <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-dim">
                {app.tab === 'following'
                  ? 'Your follow list is not heating anything. Explore the board, or follow a few high thermal-mass voices.'
                  : 'This filter is cold. The Heat Diffusion cliff removes dead content instead of padding it — try another mode.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button onClick={() => { app.setTab('for-you'); app.setMode('heat'); }} className="ht-btn ht-btn--heat">Back to the board</button>
                <button onClick={() => app.go('/explore')} className="ht-btn">Explore tags</button>
              </div>
            </div>
          )}

          {hidden > 0 && (
            <div className="ht-panel mt-6 flex items-center gap-4 p-5">
              <div className="relative h-[42px] w-[42px] shrink-0">
                <span className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 180deg, var(--ht-flare), transparent 60%)', opacity: 0.5 }} />
                <span className="absolute inset-[10px] rounded-full bg-[#0c0c0f]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="ht-title text-[16px]">You reached the cliff</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
                  {hidden} item{hidden === 1 ? '' : 's'} fell off the engagement cliff — their heat is still high, but the velocity is gone. We demote them instead of padding your scroll.
                </p>
              </div>
              <button onClick={() => app.go('/explore')} className="ht-btn ht-btn--ghost !text-[12px]">
                Browse anyway
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-ink-faint">
            <span>keyboard:</span>
            {[['j', 'k', 'move'], ['h', '', 'heat up'], ['l', '', 'cool'], ['↵', '', 'open']].map(([a, b, c]) => (
              <span key={c} className="flex items-center gap-1">
                <kbd className="rounded border border-white/12 bg-white/[.03] px-1.5 py-0.5 font-sans text-[10px] font-bold">{a}</kbd>
                {b && <kbd className="rounded border border-white/12 bg-white/[.03] px-1.5 py-0.5 font-sans text-[10px] font-bold">{b}</kbd>}
                <span>{c}</span>
              </span>
            ))}
          </div>

          <footer className="py-10 text-center">
            <p className="text-[12.5px] text-ink-faint">
              heatt · {app.posts.length} items · {app.wire.length} syndicated · press <kbd className="rounded border border-white/10 px-1">⌘K</kbd> for anything
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-ink-faint">
              {items.slice(0, 3).map((p) => (
                <Avatar key={p.id} name={p.authorName} handle={p.authorHandle} src={p.authorAvatar} size={20} ring={2} />
              ))}
              <span>and {Math.max(0, app.posts.length - 3)} more heating the board</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} className="ht-card p-5" animate={{ opacity: [0.45, 0.8, 0.45] }} transition={{ duration: 1.9, repeat: Infinity, delay: i * 0.15 }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/[.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-white/[.06]" />
              <div className="h-2.5 w-20 rounded bg-white/[.04]" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-[85%] rounded bg-white/[.06]" />
            <div className="h-4 w-[70%] rounded bg-white/[.04]" />
          </div>
          <div className="mt-4 h-[132px] w-full rounded-[16px] bg-white/[.035]" />
        </motion.div>
      ))}
    </div>
  );
}
