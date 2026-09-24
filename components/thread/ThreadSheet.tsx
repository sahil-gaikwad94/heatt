'use client';
/* ============================================================================
   components/thread/ThreadSheet — replies on a note or a story.

   A bottom sheet on phones, a centred panel on desktop. Shows the piece, the
   replies in order, and one field. Replies are local to this device — there is
   no stranger on the other end of the wire.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Avatar, Modal } from '@/components/ui/primitives';
import { RichText } from '@/components/cards/PostCard';
import { HeatButton } from '@/components/heat/HeatButton';
import { cls, plain, timeAgo } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';

export function ThreadSheet() {
  const app = useApp();
  const s = useStore();
  const id = app.threadId;
  const post = id ? app.posts.find((p) => p.id === id) : null;
  const [text, setText] = React.useState('');
  const [level, setLevel] = React.useState(0);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const replies = React.useMemo(
    () => (id ? s.replies.filter((r) => r.postId === id).sort((a, b) => a.at - b.at) : []),
    [id, s.replies]
  );

  React.useEffect(() => {
    if (id) setLevel(app.heatOf(id));
    else setText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const close = () => app.setThread(null);

  const send = () => {
    if (!post || !text.trim()) return;
    useStore.getState().addReply({
      postId: post.id,
      author: s.me?.handle ?? 'you',
      text: text.trim(),
    });
    app.toast('Reply added to the thread', 'heat');
    setText('');
    inputRef.current?.focus();
  };

  if (!post) return null;
  const counts = app.countOf(post);
  const mine = post.authorHandle === (s.me?.handle ?? 'you');

  return (
    <AnimatePresence>
      <Modal open={!!post} onClose={close} label={`Replies on ${post.title ?? 'note'}`} align="center">
        <div className="flex max-h-[min(84dvh,760px)] flex-col">
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <Avatar name={post.authorName} handle={post.authorHandle} src={post.authorAvatar} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-ink">{post.authorName}</p>
              <p className="truncate text-[11.5px] text-ink-faint">
                @{post.authorHandle} · {timeAgo(post.date)} ago
              </p>
            </div>
            <button onClick={close} className="ht-icon-btn !h-8 !w-8" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="ht-no-scrollbar flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-[var(--r-md)] border border-line bg-white/[.015] p-4">
              {post.title && <h3 className="ht-title text-[16px] leading-snug text-ink">{post.title}</h3>}
              <RichText
                text={post.kind === 'spark' ? post.text ?? '' : plain(post.dek ?? '').slice(0, 320)}
                className="mt-2 text-[13.5px] leading-relaxed text-ink-dim"
              />
              <div className="mt-3.5 flex items-center gap-2">
                <HeatButton
                  level={level as never}
                  count={counts.reactions}
                  heat={post.heatScore?.heat ?? 0}
                  size="sm"
                  onChange={(l, meta) => {
                    setLevel(l);
                    app.setHeat(post.id, l, { title: post.title, author: post.authorHandle, ...meta });
                  }}
                />
                {!mine && (
                  <a href={`/u/${post.authorHandle}`} className="ht-chip">
                    @{post.authorHandle}
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {replies.length === 0 && (
                <p className="text-[13px] text-ink-faint">
                  No replies yet. Say the thing you would say out loud — it stays on your device.
                </p>
              )}
              <AnimatePresence initial={false}>
                {replies.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="flex items-start gap-3"
                  >
                    <Avatar name={s.me?.name ?? 'You'} handle={r.author} src={s.me?.avatar} size={30} />
                    <div className="min-w-0 flex-1 rounded-[var(--r-md)] border border-line bg-white/[.02] px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[11.5px] text-ink-faint">
                          @{r.author} · {timeAgo(r.at)} ago
                        </p>
                        {r.author === (s.me?.handle ?? 'you') && (
                          <button
                            onClick={() => app.deleteReply(r.id)}
                            className="ht-icon-btn !h-6 !w-6 shrink-0"
                            aria-label="Delete your reply"
                            title="Delete your reply"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <RichText text={r.text} className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <footer className="border-t border-line p-3.5">
            <div className="flex items-end gap-2.5">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 600))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
                }}
                rows={2}
                data-autofocus
                placeholder="Add to the thread…"
                aria-label="Add a reply"
                className="ht-input !h-auto min-h-[54px] resize-none py-2.5"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className={cls('ht-round shrink-0')}
                aria-label="Reply"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-ink-4">⌘↵ to send · replies live on this device only</p>
          </footer>
        </div>
      </Modal>
    </AnimatePresence>
  );
}
