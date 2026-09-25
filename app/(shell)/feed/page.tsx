'use client';
/* ============================================================================
   /feed — the board.

   One column. The top-ranked story gets the feature treatment (artwork first,
   copy under it, one round control), everything else lines up as cards behind
   a single filter rail. The board ends — it is not infinite — and then the
   wire status closes the page.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { PostCard } from '@/components/cards/PostCard';
import { Avatar, Chip, Empty } from '@/components/ui/primitives';
import { BoardControls, TopBar, WireStatus, PageHead } from '@/components/shell/Shell';
import { trendingTags } from '@/lib/feed';
import { compact, plain } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';
import { useScrollMemory } from '@/lib/scroll';

export default function FeedPage() {
  const app = useApp();
  const s = useStore();
  const [tagsOpen, setTagsOpen] = React.useState(false);

  /* coming back from a story should land where you were reading */
  useScrollMemory('board');

  /* a note's permalink (/n/<id>) arrives here as ?note=<id>: open its thread
     and clean the address, so a shared note lands on the conversation */
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('note');
    if (!id) return;
    if (app.posts.some((p) => p.id === id)) app.setThread(id);
    const url = new URL(window.location.href);
    url.searchParams.delete('note');
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.posts]);

  const items = app.ranked;
  const lead = items.find((p) => p.kind === 'forge' && p.cover) ?? items[0];
  /* the feature slot only exists on the mixed board */
  const feature = app.tab === 'notes' ? undefined : lead;
  const rest = items.filter((p) => p.id !== feature?.id);
  const all = feature ? [feature, ...rest] : rest;
  const [cursor, setCursor] = React.useState(-1);
  const tags = React.useMemo(() => trendingTags(app.posts, Date.now(), 9), [app.posts]);
  const keepCount = Object.keys(s.saved).length;
  /* j/k walk the board, h heats where the cursor sits, o opens, Esc releases */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'j' || k === 'k') {
        e.preventDefault();
        setCursor((c) => (k === 'j' ? Math.min(all.length - 1, c + 1) : Math.max(0, c - 1)));
        return;
      }
      if (k === 'escape') return setCursor(-1);
      const p = all[cursor];
      if (!p) return;
      if (k === 'h') {
        e.preventDefault();
        const next = (useStore.getState().heat[p.id]?.level ?? 0) === 0 ? 1 : 0;
        app.setHeat(p.id, next as 1 | 0, { title: p.title ?? plain(p.text ?? '').slice(0, 46), author: p.authorHandle });
      }
      if (k === 'o' || k === 'enter') {
        e.preventDefault();
        app.openPost(p.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [all, cursor, app]);

  const activeAuthors = React.useMemo(
    () => [...new Set(items.slice(0, 8).map((p) => p.authorHandle))].filter((h) => h !== s.me?.handle),
    [items, s.me]
  );

  return (
    <>
      <TopBar
        right={
          <button onClick={() => app.setPalette(true)} className="ht-icon-btn md:hidden" aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.2-4.2" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      <div className="ht-stage pt-2">
        <PageHead
          eyebrow="the board"
          title="What is burning"
          dek={
            app.tab === 'kept'
              ? 'Everything you kept, newest first — the one list in heatt that accumulates.'
              : 'Ranked by heat: what people responded to, faded by age, with no scoreboard attached to anyone.'
          }
          action={
            <div className="flex items-center gap-3">
              {activeAuthors.length > 1 && (
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="ht-cluster">
                    {activeAuthors.slice(0, 4).map((h) => {
                      const u = app.posts.find((p) => p.authorHandle === h)?.author;
                      return (
                        <span key={h} className="grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full bg-elev">
                          <Avatar name={u?.name ?? h} handle={h} src={u?.avatar} size={26} />
                        </span>
                      );
                    })}
                  </span>
                  <span className="text-[11.5px] text-ink-faint">in this run</span>
                </span>
              )}
              <button onClick={() => setTagsOpen((v) => !v)} className="ht-chip" aria-expanded={tagsOpen}>
                #{tags[0]?.tag ?? 'design'}
                <span className="ht-ink-4">▾</span>
              </button>
            </div>
          }
        />

        <AnimatePresence initial={false}>
          {tagsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.36, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="mb-6 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => {
                      app.setQuery(t.tag);
                      setTagsOpen(false);
                      app.go(`/explore?q=${encodeURIComponent(t.tag)}`);
                    }}
                    className="ht-chip"
                  >
                    #{t.tag}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* new stories are held until they are asked for — the board never
            rearranges itself under someone who is reading it */}
        <AnimatePresence>
          {app.newCount > 0 && (
            <motion.button
              key="new-stories"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.42, ease: EASE_OUT }}
              onClick={() => app.adoptNew()}
              className="mb-4 flex w-full items-center gap-3 overflow-hidden text-left"
              aria-label={`Show ${app.newCount} new ${app.newCount === 1 ? 'story' : 'stories'}`}
            >
              <span className="ht-newstrip">
                <span className="ht-newstrip__dot" aria-hidden />
                {app.newCount} new {app.newCount === 1 ? 'story' : 'stories'} on the wire
                <span className="ht-newstrip__go">
                  show
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                </span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <BoardControls />

        {items.length === 0 ? (
          <Empty
            title={app.tab === 'kept' ? 'Nothing kept yet' : 'Nothing here yet'}
            body={
              app.tab === 'kept'
                ? 'Keep a story and it lands here, with the paragraph you stopped at still waiting for you.'
                : 'Try another filter, or write the first note of the day.'
            }
            action={
              <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--heat">
                Write something
              </button>
            }
          />
        ) : (
          <>
            {feature && (
              <div className="mb-4">
                <PostCard post={feature} index={0} feature active={cursor === 0} />
              </div>
            )}

            <div className="space-y-3.5">
              {rest.map((p, i) => (
                <PostCard key={p.id} post={p} index={feature ? i + 1 : i} active={cursor === (feature ? i + 1 : i)} />
              ))}
            </div>

            <p className="mt-8 text-center text-[11.5px] text-ink-4">
              keyboard: <span className="ht-kbd">j</span> <span className="ht-kbd">k</span> move ·{' '}
              <span className="ht-kbd">h</span> heat · <span className="ht-kbd">o</span> open ·{' '}
              <span className="ht-kbd">⌘K</span> search
            </p>
          </>
        )}

        {app.tab === 'kept' && keepCount === 0 && (
          <p className="mt-6 text-center text-[12.5px] text-ink-faint">
            Your library keeps {compact(keepCount)} pieces. Keep one with the bookmark on any card.
          </p>
        )}

        {/* ------------------------------------------------------- the wire */}
        {app.wire.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <span className="ht-eyebrow">from the wire</span>
                <h2 className="ht-display mt-2.5 text-[clamp(1.3rem,1.1rem+1vw,1.8rem)]">Written elsewhere, read here</h2>
              </div>
              <Link href="/explore" className="ht-chip shrink-0">
                Browse all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {app.wire.slice(0, 4).map((w) => {
                const post = app.posts.find((p) => p.id === w.id);
                if (!post) return null;
                return (
                  <Link
                    key={w.id}
                    href={`/read/${encodeURIComponent(w.id)}`}
                    className="ht-card ht-card--pad block transition-colors hover:border-line-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={w.author} handle={w.handle} src={w.avatar} size={22} />
                      <span className="truncate text-[11.5px] text-ink-faint">
                        @{w.handle} · {w.minutes} min
                      </span>
                    </div>
                    <h3 className="ht-title mt-3 line-clamp-2 text-[15px] leading-snug text-ink">{w.title}</h3>
                    <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-mute">{w.dek}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Chip tone="iris" as="span">
                        Dev.to
                      </Chip>
                      <span className="ht-num text-[11px] text-ink-4">{compact(w.reactions)} reactions</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <WireStatus />
      </div>
    </>
  );
}
