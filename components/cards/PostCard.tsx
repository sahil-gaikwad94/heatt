'use client';
/* ============================================================================
   components/cards/PostCard — the card everything in the app is made of.

   Card anatomy (the app's one repeated shape):

     ┌───────────────────────────────────────────────┐
     │ avatar · name · @handle · 4h            ⋯     │
     │ TITLE or the note itself (display / body)     │
     │ standfirst for a story                        │
     │ [ optional media / link preview / poll ]      │
     │ heat · replies            keep  share  open → │
     └───────────────────────────────────────────────┘

   The first item of the board uses the *feature* variant: artwork first, copy
   beneath it, and a single round control that opens the piece. Same card,
   more presence.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { cls, compact, coverFallback, plain, timeAgo } from '@/lib/util';
import { Avatar, Chip } from '@/components/ui/primitives';
import { HeatButton } from '@/components/heat/HeatButton';
import { FireOverlay, burstFrom } from '@/components/heat/FireOverlay';
import { EASE_OUT, tileIn } from '@/lib/motion';
import type { Post } from '@/lib/feed';

export function PostCard({
  post,
  index = 0,
  feature,
  active = false,
}: {
  post: Post;
  index?: number;
  feature?: boolean;
  /** keyboard cursor — j/k move it, h heats wherever it lands */
  active?: boolean;
}) {
  const app = useApp();
  const saved = useStore((s) => !!s.saved[post.id]);
  const level = useStore((s) => s.heat[post.id]?.level ?? 0);
  const burning = !!app.igniting[post.id];
  const cardRef = React.useRef<HTMLElement | null>(null);
  const counts = app.countOf(post);
  const heat = post.heatScore?.heat ?? Math.round((post as { heat?: number }).heat ?? 0);
  const isStory = post.kind === 'forge';
  const title = isStory ? post.title ?? 'Untitled story' : undefined;
  const body = isStory ? post.dek : post.text;
  const open = () => app.openPost(post.id);

  /* the keyboard cursor scrolls itself into view and takes focus, so a screen
     reader announces the card you moved to */
  React.useEffect(() => {
    if (!active) return;
    const el = cardRef.current;
    if (!el) return;
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    (el as HTMLElement).focus?.({ preventScroll: true });
  }, [active]);

  const onHeat = (next: 1 | 2 | 3 | 0, meta: { ignited: boolean }) => {
    app.setHeat(post.id, next, { title: title ?? plain(post.text ?? '').slice(0, 46), author: post.authorHandle });
    if (meta.ignited) {
      const card = cardRef.current;
      const host = card?.parentElement ?? card;
      if (host && card) burstFrom(host, card, 14);
    }
  };

  if (feature && post.cover) {
    return (
      <Shell post={post} index={index} ref={cardRef} burning={burning} feature active={active}>
        <FeatureBody post={post} onOpen={open} level={level} count={counts.reactions} heat={heat} onHeat={onHeat} saved={saved} />
      </Shell>
    );
  }

  return (
    <Shell post={post} index={index} ref={cardRef} burning={burning} active={active}>
      <div className="relative p-4 sm:p-[18px]">
        <header className="flex items-center gap-2.5">
          <Link href={`/u/${post.authorHandle}`} className="shrink-0" aria-label={`${post.authorName} profile`}>
            <Avatar name={post.authorName} handle={post.authorHandle} src={post.authorAvatar} size={36} />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={`/u/${post.authorHandle}`} className="block truncate text-[13.5px] font-semibold text-ink hover:text-white">
              {post.authorName}
              {post.author?.verified && <VerifiedGlyph />}
            </Link>
            <span className="block truncate text-[11.5px] text-ink-faint">
              @{post.authorHandle} · {timeAgo(post.date)}
              {post.org ? ` · ${post.org}` : ''}
            </span>
          </div>
          <CardMenu post={post} />
        </header>

        {title ? (
          <button onClick={open} className="mt-3.5 block w-full text-left">
            <h2 className="ht-title text-[clamp(1.05rem,1rem+0.5vw,1.35rem)] leading-[1.15] text-ink transition-colors hover:text-white">
              {title}
            </h2>
            {body && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-dim">{plain(body)}</p>}
          </button>
        ) : (
          <RichText text={post.text ?? ''} className="mt-3.5 text-[14.5px] leading-[1.62] text-ink/92" onTag={(t) => app.go(`/explore?q=${encodeURIComponent(t.replace(/^#/, ''))}`)} />
        )}

        {post.media?.[0] && (
          <button onClick={open} className="mt-3.5 block w-full overflow-hidden rounded-[var(--r-md)] border border-line" aria-label="Open media">
            <img
              src={post.media[0].url}
              alt={post.media[0].alt}
              className="aspect-[16/10] w-full object-cover transition-transform duration-[900ms] hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          </button>
        )}

        {post.link && <LinkCard link={post.link} />}
        {post.poll && <Poll postId={post.id} poll={post.poll} />}

        <footer className="mt-4 flex items-center gap-2">
          <HeatButton level={level as never} count={counts.reactions} heat={heat} onChange={onHeat} size="md" />
          <button
            onClick={() => app.setThread(post.id)}
            className="ht-icon-btn !h-9 !w-9"
            aria-label={`Reply to ${post.authorName} — ${counts.comments} replies`}
          >
            <ReplyIcon />
          </button>
          <span className="flex-1" />
          <button
            onClick={() => {
              useStore.getState().toggleSave(post.id);
              app.toast(saved ? 'Removed from your library' : 'Kept in your library', saved ? 'plain' : 'heat');
            }}
            className="ht-icon-btn !h-9 !w-9"
            data-active={saved || undefined}
            aria-label={saved ? 'Remove from library' : 'Keep in library'}
          >
            <BookmarkIcon active={saved} />
          </button>
          <button onClick={() => app.setShare(post.id)} className="ht-icon-btn !h-9 !w-9" aria-label="Share as a story">
            <ShareIcon />
          </button>
          <button onClick={open} className="ht-round ht-round--sm !h-9 !w-9" aria-label={isStory ? 'Open story' : 'Open reply thread'}>
            <ArrowGlyph />
          </button>
        </footer>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ shell */

const Shell = React.forwardRef<
  HTMLElement,
  {
    post: Post;
    index: number;
    burning: boolean;
    feature?: boolean;
    active?: boolean;
    children: React.ReactNode;
  }
>(function Shell({ post, index, burning, feature, active, children }, ref) {
  return (
    <motion.article
      ref={ref as React.Ref<HTMLElement>}
      layout="position"
      variants={tileIn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-6% 0px -4% 0px' }}
      transition={{ delay: Math.min(0.18, (index % 6) * 0.045) }}
      className={cls('ht-card group/card relative', burning && 'ht-ignite-card', feature && 'overflow-hidden')}
      data-fi={index}
      data-kind={post.kind}
      data-active={active || undefined}
      tabIndex={active ? -1 : undefined}
    >
      {children}
      <FireOverlay active={burning} variant="full" />
    </motion.article>
  );
});

/* ---------------------------------------------------------------- variants */

function FeatureBody({
  post,
  onOpen,
  level,
  count,
  heat,
  onHeat,
  saved,
}: {
  post: Post;
  onOpen: () => void;
  level: number;
  count: number;
  heat: number;
  onHeat: (l: never, m: { ignited: boolean }) => void;
  saved: boolean;
}) {
  return (
    <>
      <button onClick={onOpen} className="ht-feature__media block w-full" aria-label={`Read ${post.title}`}>
        {/* one slow settle on entry, then completely still */}
        <motion.img
          src={post.cover}
          alt=""
          loading="lazy"
          decoding="async"
          onError={coverFallback(post.id)}
          initial={{ scale: 1.055, opacity: 0.55 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-8% 0px' }}
          transition={{ duration: 1.35, ease: EASE_OUT }}
        />
        <span className="ht-feature__veil" />
        <span className="absolute left-4 top-4 flex items-center gap-2">
          <Chip tone="heat" as="span">
            {post.minutes ?? 6} min read
          </Chip>
          {heat >= 60 && <Chip tone="gold" as="span">{heat}° heat</Chip>}
        </span>
      </button>
      <div className="ht-feature__body">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar name={post.authorName} handle={post.authorHandle} src={post.authorAvatar} size={26} />
            <span className="truncate text-[12.5px] text-ink-2">
              @{post.authorHandle} · {timeAgo(post.date)}
            </span>
          </div>
          <button onClick={onOpen} className="mt-2 block text-left">
            <h2 className="ht-title text-[clamp(1.25rem,1.1rem+1vw,1.75rem)] leading-[1.1] text-white">{post.title}</h2>
          </button>
          {post.dek && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-dim">{plain(post.dek)}</p>}
          <div className="mt-3.5 flex items-center gap-2">
            <HeatButton level={level as never} count={count} heat={heat} onChange={onHeat as never} size="sm" />
            <SaveButton id={post.id} saved={saved} />
            <ShareButton id={post.id} />
          </div>
        </div>
        <button onClick={onOpen} className="ht-round hidden shrink-0 sm:grid" aria-label="Open story">
          <ArrowGlyph />
        </button>
      </div>
    </>
  );
}

function SaveButton({ id, saved }: { id: string; saved: boolean }) {
  const app = useApp();
  return (
    <button
      onClick={() => {
        useStore.getState().toggleSave(id);
        app.toast(saved ? 'Removed from your library' : 'Kept in your library', saved ? 'plain' : 'heat');
      }}
      className="ht-icon-btn !h-9 !w-9"
      data-active={saved || undefined}
      aria-label={saved ? 'Remove from library' : 'Keep in library'}
    >
      <BookmarkIcon active={saved} />
    </button>
  );
}

function ShareButton({ id }: { id: string }) {
  const app = useApp();
  return (
    <button onClick={() => app.setShare(id)} className="ht-icon-btn !h-9 !w-9" aria-label="Share as a story">
      <ShareIcon />
    </button>
  );
}

/* -------------------------------------------------------------- rich text */

/** Minimal inline markdown: **bold**, *italic*, `code`, #tags, @mentions. */
export function RichText({
  text,
  className,
  onTag,
}: {
  text: string;
  className?: string;
  onTag?: (t: string) => void;
}) {
  const parts = React.useMemo(() => tokenize(text), [text]);
  return (
    <p className={cls('ht-pre-wrap', className)}>
      {parts.map((p, i) => {
        if (p.t === 'b') return <strong key={i} className="font-semibold text-white">{p.v}</strong>;
        if (p.t === 'i') return <em key={i} className="italic text-ink">{p.v}</em>;
        if (p.t === 'c')
          return (
            <code key={i} className="rounded-[6px] border border-line-2 bg-white/[.05] px-1.5 py-0.5 font-mono text-[0.85em] text-ink-2">
              {p.v}
            </code>
          );
        if (p.t === 'tag')
          return (
            <button
              key={i}
              onClick={() => onTag?.(p.v)}
              className="text-ember-300 transition-colors hover:text-ember-200"
            >
              {p.v}
            </button>
          );
        if (p.t === 'mention')
          return (
            <Link key={i} href={`/u/${p.v.slice(1)}`} className="text-ember-300 hover:text-ember-200">
              {p.v}
            </Link>
          );
        return <React.Fragment key={i}>{p.v}</React.Fragment>;
      })}
    </p>
  );
}

type Token = { t: 'text' | 'b' | 'i' | 'c' | 'tag' | 'mention'; v: string };

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|#[\p{L}\p{N}_-]+|@[\p{L}\p{N}_.-]+)/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ t: 'text', v: text.slice(last, idx) });
    const raw = m[0];
    if (raw.startsWith('**')) out.push({ t: 'b', v: raw.slice(2, -2) });
    else if (raw.startsWith('`')) out.push({ t: 'c', v: raw.slice(1, -1) });
    else if (raw.startsWith('*')) out.push({ t: 'i', v: raw.slice(1, -1) });
    else if (raw.startsWith('#')) out.push({ t: 'tag', v: raw });
    else out.push({ t: 'mention', v: raw });
    last = idx + raw.length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

/* --------------------------------------------------------- link & poll bits */

function LinkCard({ link }: { link: NonNullable<Post['link']> }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3.5 flex items-stretch gap-0 overflow-hidden rounded-[var(--r-md)] border border-line bg-white/[.015] transition-colors hover:border-line-2 hover:bg-white/[.03]"
    >
      {link.image && (
        <img src={link.image} alt="" className="hidden h-[86px] w-[120px] shrink-0 object-cover sm:block" loading="lazy" />
      )}
      <span className="min-w-0 flex-1 p-3">
        <span className="ht-label block !text-[9.5px] text-ember-300">{link.site}</span>
        <span className="mt-1 block line-clamp-1 text-[13.5px] font-semibold text-ink">{link.title}</span>
        {link.desc && <span className="mt-1 block line-clamp-2 text-[12.5px] leading-snug text-ink-mute">{link.desc}</span>}
      </span>
    </a>
  );
}

function Poll({ postId, poll }: { postId: string; poll: NonNullable<Post['poll']> }) {
  /* your answer is stored, not just displayed — and tapping it again clears it */
  const voted = useStore((s) => s.votes[postId]);
  const hasVoted = typeof voted === 'number';
  const total = poll.options.reduce((a, o) => a + o.votes, 0) + (hasVoted ? 1 : 0);

  return (
    <div className="mt-3.5 rounded-[var(--r-md)] border border-line p-3.5" role="group" aria-label={poll.question}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-ink">{poll.question}</p>
        <span className="ht-num shrink-0 text-[11px] text-ink-4">{compact(total)} votes</span>
      </div>
      <div className="mt-3 space-y-2">
        {poll.options.map((o, i) => {
          const votes = o.votes + (voted === i ? 1 : 0);
          const pct = total ? Math.round((votes / total) * 100) : 0;
          const mine = voted === i;
          return (
            <button
              key={`${postId}-${o.label}`}
              onClick={() => useStore.getState().castVote(postId, i)}
              aria-pressed={mine}
              className={cls(
                'relative block w-full overflow-hidden rounded-[var(--r-xs)] border px-3 py-2 text-left transition-colors',
                mine ? 'border-[var(--champ-line)]' : 'border-line hover:border-line-2'
              )}
            >
              {hasVoted && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${pct}%`,
                    background: mine ? 'rgba(232,211,164,.16)' : 'rgba(255,255,255,.05)',
                    transition: 'width 640ms cubic-bezier(.22,1,.36,1)',
                  }}
                />
              )}
              <span className="relative flex items-center justify-between text-[13px]">
                <span className={cls(mine ? 'font-semibold text-ink' : 'text-ink-2')}>{o.label}</span>
                {hasVoted && <span className="ht-num text-[11.5px] text-ink-mute">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-ink-4">
        {hasVoted ? 'Your answer is stored on this device. Tap it again to take it back.' : 'One tap to answer — nothing is sent anywhere.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ menu */

export function CardMenu({ post }: { post: Post }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const muted = useStore((s) => s.muted.includes(`@${post.authorHandle}`));
  const saved = useStore((s) => !!s.saved[post.id]);

  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((v) => !v)} className="ht-icon-btn !h-8 !w-8" aria-label="Post options" aria-expanded={open}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button className="fixed inset-0 z-[60] cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="ht-sheet absolute right-0 top-9 z-[61] w-[210px] overflow-hidden p-1.5"
              role="menu"
            >
              <MenuRow
                onClick={() => {
                  useStore.getState().toggleSave(post.id);
                  app.toast(saved ? 'Removed from your library' : 'Kept in your library', saved ? 'plain' : 'heat');
                  setOpen(false);
                }}
              >
                {saved ? 'Remove from library' : 'Keep in library'}
              </MenuRow>
              <MenuRow
                onClick={() => {
                  app.setShare(post.id);
                  setOpen(false);
                }}
              >
                Share as a story
              </MenuRow>
              {post.origin === 'wire' && post.canonical && (
                <MenuRow
                  onClick={() => {
                    window.open(post.canonical, '_blank', 'noopener');
                    setOpen(false);
                  }}
                >
                  Open original ↗
                </MenuRow>
              )}
              <MenuRow
                onClick={() => {
                  useStore.getState().toggleMute(`@${post.authorHandle}`);
                  app.toast(muted ? `Unmuted @${post.authorHandle}` : `Muted @${post.authorHandle}`, muted ? 'heat' : 'cool');
                  setOpen(false);
                }}
              >
                {muted ? `Unmute @${post.authorHandle}` : `Mute @${post.authorHandle}`}
              </MenuRow>
              <MenuRow
                onClick={() => {
                  navigator.clipboard?.writeText(`${location.origin}/read/${post.id}`);
                  app.toast('Link copied', 'plain');
                  setOpen(false);
                }}
              >
                Copy link
              </MenuRow>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="block w-full rounded-[var(--r-sm)] px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-white/[.06] hover:text-ink"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ glyphs */

export function BookmarkIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-3.8L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export const ReplyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 12a7.5 7.5 0 0 1-11 6.7L4 20l1.3-4.2A7.5 7.5 0 1 1 20 12Z" />
  </svg>
);

export const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
  </svg>
);

export const ArrowGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const VerifiedGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="ml-1 inline-block align-[-1px] text-ember-300">
    <path
      d="M12 2.6l2.3 2 3-.3 1 2.9 2.6 1.6-1 2.9 1 2.9-2.6 1.6-1 2.9-3-.3-2.3 2-2.3-2-3 .3-1-2.9L3 17.5l1-2.9-1-2.9 2.6-1.6 1-2.9 3 .3z"
      fill="currentColor"
      opacity=".9"
    />
    <path d="M8.6 12.2l2.3 2.3 4.3-4.4" stroke="#08080b" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
