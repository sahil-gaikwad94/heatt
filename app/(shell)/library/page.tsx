'use client';
/* ============================================================================
   /library — what you kept.

   The only place in heatt that accumulates. Two shelves: pieces kept, and
   pieces you are part-way through. No counts of minutes, no charts, no
   "your year".
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { PostCard } from '@/components/cards/PostCard';
import { Empty, Meter, Avatar } from '@/components/ui/primitives';
import { PageHead, TopBar } from '@/components/shell/Shell';
import { EASE_OUT } from '@/lib/motion';
import { plain, timeAgo } from '@/lib/util';

type Shelf = 'kept' | 'reading';

export default function LibraryPage() {
  const app = useApp();
  const s = useStore();
  const [shelf, setShelf] = React.useState<Shelf>('kept');

  const kept = React.useMemo(
    () =>
      Object.entries(s.saved)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => app.posts.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p),
    [s.saved, app.posts]
  );

  const reading = React.useMemo(
    () =>
      Object.entries(s.reads)
        .filter(([, r]) => r.pct >= 2 && r.pct < 97)
        .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
        .map(([id, r]) => {
          const post = app.posts.find((p) => p.id === id);
          return post ? { post, pct: Math.round(r.pct), at: r.at } : null;
        })
        .filter((x): x is { post: NonNullable<ReturnType<typeof app.posts.find>> extends never ? never : NonNullable<(typeof app.posts)[number]>; pct: number; at: number } => !!x),
    [s.reads, app.posts]
  );

  const finished = React.useMemo(
    () => Object.values(s.reads).filter((r) => r.finished).length,
    [s.reads]
  );

  return (
    <>
      <TopBar />
      <div className="ht-stage pt-2">
        <PageHead
          eyebrow="your library"
          title="Kept, on purpose"
          dek={`${kept.length} ${kept.length === 1 ? 'piece' : 'pieces'} kept · ${finished} read to the end. Nothing here is ranked; it is simply in the order you chose it.`}
        />

        <div className="ht-tabrail mb-6" role="tablist" aria-label="Library shelves">
          {([
            { key: 'kept', label: `Kept ${kept.length ? `· ${kept.length}` : ''}` },
            { key: 'reading', label: `Reading ${reading.length ? `· ${reading.length}` : ''}` },
          ] as { key: Shelf; label: string }[]).map((t) => {
            const active = shelf === t.key;
            return (
              <button key={t.key} role="tab" aria-selected={active} onClick={() => setShelf(t.key)} className="ht-tab">
                {active && (
                  <motion.span layoutId="shelf-tab" className="absolute inset-0 rounded-full bg-white/[.08]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {shelf === 'kept' ? (
            <motion.div
              key="kept"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.34, ease: EASE_OUT }}
              className="space-y-3.5"
            >
              {kept.length === 0 ? (
                <Empty
                  title="Nothing kept yet"
                  body="The bookmark on any card puts a piece here. It stays until you take it out — nothing expires."
                  action={
                    <Link href="/feed" className="ht-btn ht-btn--heat">
                      Back to the board
                    </Link>
                  }
                />
              ) : (
                kept.map((p, i) => <PostCard key={p.id} post={p} index={i} />)
              )}
            </motion.div>
          ) : (
            <motion.div
              key="reading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.34, ease: EASE_OUT }}
              className="space-y-3"
            >
              {reading.length === 0 ? (
                <Empty
                  title="Nothing in progress"
                  body="Open a story and leave it part-way; it appears here with the exact place you stopped."
                  action={
                    <Link href="/explore" className="ht-btn ht-btn--quiet">
                      Find something to read
                    </Link>
                  }
                />
              ) : (
                reading.map(({ post, pct, at }) => (
                  <Link
                    key={post.id}
                    href={`/read/${encodeURIComponent(post.id)}`}
                    className="ht-card ht-card--pad block hover:border-line-2"
                  >
                    <div className="flex items-center gap-3">
                      {post.cover ? (
                        <img src={post.cover} alt="" className="h-[46px] w-[46px] shrink-0 rounded-[var(--r-xs)] object-cover" />
                      ) : (
                        <Avatar name={post.authorName} handle={post.authorHandle} src={post.authorAvatar} size={46} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{post.title ?? plain(post.text ?? '').slice(0, 60)}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          @{post.authorHandle} · {at ? `stopped ${timeAgo(at)} ago` : 'in progress'}
                        </p>
                      </div>
                      <span className="ht-num shrink-0 text-[12.5px] text-ember-300">{pct}%</span>
                    </div>
                    <Meter value={pct} className="mt-3.5" />
                  </Link>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-12 border-t border-line pt-6 text-[12px] text-ink-4">
          heatt keeps this locally on your device. There is no account to log into and nothing here is ranked against anyone else.
        </p>
      </div>
    </>
  );
}
