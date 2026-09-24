'use client';
/* ============================================================================
   /notifications — signals.

   Only what you caused: heat on something you wrote, replies to your notes,
   and a weekly digest you can switch off. There is no "12 people you don't
   know just followed someone" feed, because there is no such activity here.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Avatar, Empty } from '@/components/ui/primitives';
import { PageHead, TopBar } from '@/components/shell/Shell';
import {cls, timeAgo, plain } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';

export default function NotificationsPage() {
  const app = useApp();
  const s = useStore();

  /* Derived, never stored: the digest of what the board is doing right now. */
  const digest = React.useMemo(() => {
    return [...app.posts]
      .sort((a, b) => (b.heatScore?.heat ?? 0) - (a.heatScore?.heat ?? 0))
      .slice(0, 3);
  }, [app.posts]);

  const mine = React.useMemo(
    () =>
      app.posts
        .filter((p) => p.authorHandle === (s.me?.handle ?? 'you'))
        .map((p) => ({ post: p, heats: p.reactions, replies: p.comments })),
    [app.posts, s.me]
  );

  return (
    <>
      <TopBar />
      <div className="ht-stage pt-2">
        <PageHead eyebrow="signals" title="What came back" dek="Heat and replies on the things you put into the room, plus one digest of the board." />

        <section className="space-y-3">
          {mine.length === 0 && (
            <Empty
              title="Nothing of yours in the room yet"
              body="Write a note and the heat and replies it collects will show up here. Nothing else will."
              action={
                <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--heat">
                  Write a note
                </button>
              }
            />
          )}

          <AnimatePresence initial={false}>
            {mine.map(({ post, heats, replies }) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.34, ease: EASE_OUT }}
                className="ht-card ht-card--pad"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={s.me?.name ?? 'You'} handle={s.me?.handle ?? 'you'} src={s.me?.avatar} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-2">
                      <span className="font-semibold text-ink">You</span> wrote{' '}
                      <span className="text-ink-3">{timeAgo(post.date)} ago</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13.5px] text-ink">{post.title ?? plain(post.text ?? '').slice(0, 120)}</p>
                    <div className="mt-2.5 flex items-center gap-4">
                      <span className="ht-num text-[12px] text-ember-300">{heats} heats</span>
                      <button onClick={() => app.setThread(post.id)} className="text-[12px] text-ink-3 hover:text-ink">
                        {replies} replies
                      </button>
                      <span className="ht-num text-[12px] text-ink-4">{post.heatScore?.heat ?? 0}° heat</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        <section className="mt-12">
          <span className="ht-eyebrow">digest of the board</span>
          <div className="mt-4 space-y-2.5">
            {digest.map((p) => (
              <Link key={p.id} href={p.kind === 'forge' ? `/read/${encodeURIComponent(p.id)}` : '/feed'} className="ht-row">
                <Avatar name={p.authorName} handle={p.authorHandle} src={p.authorAvatar} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{p.title ?? plain(p.text ?? '').slice(0, 70)}</span>
                  <span className="block text-[11.5px] text-ink-faint">
                    @{p.authorHandle} · {p.heatScore?.heat ?? 0}° heat · {timeAgo(p.date)} ago
                  </span>
                </span>
                <span className={cls('ht-chip shrink-0', (p.heatScore?.heat ?? 0) > 60 && 'ht-chip--heat')}>
                  {p.kind === 'forge' ? `${p.minutes} min` : 'note'}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-ink-4">
            One digest, no per-event pushes. You can turn delivery off entirely in{' '}
            <Link href="/settings" className="text-ember-300 hover:text-ember-200">
              settings
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
