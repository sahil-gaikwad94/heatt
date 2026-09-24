'use client';
/* ============================================================================
   /u/[handle] — a profile.

   Structure borrowed from the reference card, rebuilt in black:

     · a floating bar that densifies as you scroll, with the name resolving in
     · a full-bleed cover that parallaxes and cools as the content rises
     · the portrait inside a champagne→glacier conic ring, badges drifting
       around it (they are real counts, not stickers)
     · name, one divided spec row, bio, traits
     · the body of work as a masonry board behind pill tabs
     · your unfinished pieces if it is your own profile

   No scoreboard anywhere — and nobody fabricated to fill the grid.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { getUser, HOUSE_HANDLE, HOUSE_COVER } from '@/lib/seed/users';
import { avatarDataUri, cls, compact, coverDataUri, prettyDate, timeAgo } from '@/lib/util';
import { Empty, Stat } from '@/components/ui/primitives';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { TopBar } from '@/components/shell/Shell';
import { CountUp, Tilt, useInViewSafe } from '@/components/ui/motion';
import { tileIn } from '@/lib/motion';
import type { Post } from '@/lib/feed';

type Tab = 'all' | 'stories' | 'notes';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'stories', label: 'Stories' },
  { key: 'notes', label: 'Notes' },
];

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const app = useApp();
  const s = useStore();
  const handle = decodeURIComponent(params?.handle ?? 'you').replace(/^@/, '');
  const isMe = handle === (s.me?.handle ?? 'you') || handle === 'you';
  const user = isMe && s.me ? s.me : getUser(handle);
  const [editing, setEditing] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('all');
  const { scrollY } = useScroll();

  /* The cover behaves like a camera: it drifts, opens and cools as content
     rises over it. Transform-only, so it stays on the compositor. */
  const coverY = useTransform(scrollY, [0, 320], [0, 86]);
  const coverScale = useTransform(scrollY, [0, 320], [1.05, 1.2]);
  const coverOpacity = useTransform(scrollY, [0, 280], [1, 0.32]);
  const barDense = useTransform(scrollY, [0, 96], [0, 1]);
  const barBg = useTransform(barDense, (v) => `rgba(6,7,10,${(v * 0.82).toFixed(3)})`);

  const posts = React.useMemo<Post[]>(
    () =>
      app.posts
        .filter((p) => p.authorHandle === handle)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [app.posts, handle]
  );

  const forges = posts.filter((p) => p.kind === 'forge');
  const notes = posts.filter((p) => p.kind === 'spark');
  const filtered = tab === 'all' ? posts : tab === 'stories' ? forges : notes;
  const isHouse = handle === HOUSE_HANDLE;
  const cover = user.cover ?? (isHouse ? HOUSE_COVER : coverDataUri(handle));
  const displayName = user.name;

  return (
    <div className="mx-auto w-full max-w-[900px] pb-32">
      {/* -------------------------------------------------------------- bar */}
      <motion.div
        className="sticky top-0 z-30 flex h-[56px] items-center gap-2 px-4"
        style={{ background: barBg, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      >
        <button onClick={() => app.go('/feed')} className="ht-icon-btn" aria-label="Back to the board">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <motion.span className="ht-title flex-1 truncate text-center text-[15px] text-ink" style={{ opacity: barDense }}>
          {displayName}
        </motion.span>
        <button onClick={() => app.setShare(`profile:${handle}`)} className="ht-icon-btn" aria-label="Share this profile">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
          </svg>
        </button>
      </motion.div>

      {/* ------------------------------------------------------------ cover */}
      <div className="relative -mt-[56px] h-[250px] overflow-hidden">
        <motion.img
          src={cover}
          alt=""
          className="h-full w-full object-cover"
          style={{ y: coverY, scale: coverScale, opacity: coverOpacity }}
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 60% at 22% 0%, rgba(232,211,164,.18), transparent 62%), radial-gradient(60% 70% at 100% 30%, rgba(107,162,255,.16), transparent 64%), linear-gradient(180deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,.15) 34%, rgba(0,0,0,.6) 74%, #000 100%)',
          }}
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(232,211,164,.45),transparent)' }} />
      </div>

      <div className="relative -mt-[74px] px-4 text-center sm:px-6">
        {/* --------------------------------------------------------- portrait */}
        <div className="relative mx-auto grid h-[132px] w-[132px] place-items-center">
          <span aria-hidden className="absolute h-[186px] w-[186px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,211,164,.26), transparent 68%)', filter: 'blur(26px)' }} />
          <motion.span
            aria-hidden
            className="absolute h-[162px] w-[162px] rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0 82%, rgba(232,211,164,.6) 92%, transparent 100%)',
              mask: 'radial-gradient(closest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))',
              WebkitMask: 'radial-gradient(closest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          />
          <span className="ht-avatar-ring grid place-items-center" data-calm={user.verified ? undefined : 'true'}>
            <img
              src={user.avatar ?? avatarDataUri(displayName, handle)}
              alt={displayName}
              onError={(e) => ((e.target as HTMLImageElement).src = avatarDataUri(displayName, handle))}
              className="relative h-[118px] w-[118px] rounded-full object-cover"
              style={{ boxShadow: '0 26px 60px -24px rgba(0,0,0,1)' }}
            />
          </span>

          <Badge label={`${forges.length} stories`} className="-left-[38px] top-[6px]" delay={0}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 3c-6 0-11 4-13 10l-3 8 8-3c6-2 10-7 8-15ZM7 13l4 4" />
            </svg>
          </Badge>
          <Badge label={`${notes.length} notes`} className="-right-[40px] top-[44px]" delay={0.8} tone="cool">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
            </svg>
          </Badge>
          {isMe && (
            <Badge label="kept pieces" className="-bottom-1 right-1" delay={1.5}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-3.8L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
              </svg>
            </Badge>
          )}
        </div>

        {/* ---------------------------------------------------------- identity */}
        <h1 className="ht-display mt-5 text-[clamp(1.7rem,1.4rem+1.8vw,2.5rem)] text-ink">{displayName}</h1>
        <p className="mt-1.5 text-[13px] text-ink-faint">
          @{handle}
          {user.org ? ` · ${user.org}` : ''}
          {user.location ? ` · ${user.location}` : ''}
        </p>
        {user.bio && <p className="mx-auto mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-dim">{user.bio}</p>}

        {/* ------------------------------------------------------------ stats */}
        <div className="ht-stats mx-auto mt-6 max-w-[460px]">
          <Stat k="stories" v={forges.length} />
          <Stat k="notes" v={notes.length} />
          <Stat k="kept" v={isMe ? Object.keys(s.saved).length : forges.length + notes.length} />
          <div className="ht-stat">
            <span className="ht-stat-v">
              <CountUp value={0} format={() => (user.joined ? prettyDate(user.joined).split(',')[0] : '—')} />
            </span>
            <span className="ht-stat-k">since</span>
          </div>
        </div>

        {user.traits && user.traits.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {user.traits.map((t) => (
              <button key={t} onClick={() => app.go(`/explore?q=${encodeURIComponent(t)}`)} className="ht-chip">
                #{t}
              </button>
            ))}
          </div>
        )}

        {user.sourceUrl && (
          <a href={user.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[12px] text-ember-300 hover:text-ember-200">
            Syndicated from Dev.to ↗
          </a>
        )}

        {/* ---------------------------------------------------------- actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {isMe ? (
            <>
              <button onClick={() => setEditing(true)} className="ht-btn ht-btn--heat">
                Edit profile
              </button>
              <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--quiet">
                Write something
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => app.toggleFollow(user.handle)}
                className={cls('ht-btn', app.follows.includes(user.handle) ? 'ht-btn--quiet' : 'ht-btn--heat')}
                aria-pressed={app.follows.includes(user.handle)}
              >
                {app.follows.includes(user.handle) ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => app.setComposer(true, { quote: `@${user.handle} ` })}
                className="ht-btn ht-btn--quiet"
              >
                Write a reply
              </button>
            </>
          )}
        </div>

        {/* --------------------------------------------------------- the work */}
        <div className="mt-12 text-left">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="ht-eyebrow">{isMe ? 'your studio' : 'their studio'}</span>
              <h2 className="ht-display mt-2.5 text-[clamp(1.4rem,1.2rem+1.3vw,2rem)]">
                {isMe ? 'What you have written' : `Writing by ${displayName.split(' ')[0]}`}
              </h2>
              <p className="mt-1.5 text-[12.5px] text-ink-faint">
                {posts.length} {posts.length === 1 ? 'piece' : 'pieces'} · newest first
              </p>
            </div>
            <div className="ht-tabrail" role="tablist" aria-label="Filter work">
              {TABS.map((t) => {
                const active = tab === t.key;
                const count = t.key === 'all' ? posts.length : t.key === 'stories' ? forges.length : notes.length;
                return (
                  <button key={t.key} role="tab" aria-selected={active} onClick={() => setTab(t.key)} className="ht-tab">
                    {active && (
                      <motion.span layoutId="profile-tab" className="absolute inset-0 rounded-full bg-white/[.08]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    )}
                    <span className="relative">
                      {t.label} <span className="ht-ink-4">{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6">
              <Empty
                title={isMe ? 'Nothing published yet' : `${displayName} has not published here`}
                body={
                  isMe
                    ? 'Notes and stories you publish land on this board, newest first. Nothing is ranked against anyone.'
                    : 'Follow to see their next piece in your board.'
                }
                action={
                  isMe ? (
                    <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--heat">
                      Write the first one
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="ht-masonry mt-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((p, i) => (
                  <Tile key={p.id} post={p} index={i} onOpen={() => app.openPost(String(p.id))} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>{editing && <ProfileEditor onClose={() => setEditing(false)} />}</AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function Badge({
  label,
  children,
  className,
  delay = 0,
  tone = 'hot',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tone?: 'hot' | 'cool';
}) {
  return (
    <motion.span
      title={label}
      aria-label={label}
      className={cls('ht-badge h-[40px] w-[40px]', className)}
      data-tone={tone === 'hot' ? 'hot' : undefined}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 + delay, type: 'spring', stiffness: 300, damping: 22 }}
      style={{ animation: `ht-float 9s ease-in-out ${delay}s infinite` }}
    >
      {children}
    </motion.span>
  );
}

function Tile({ post, onOpen, index }: { post: Post; onOpen: () => void; index: number }) {
  const { ref, seen } = useInViewSafe<HTMLDivElement>('-6% 0px -4% 0px');
  const hasCover = !!post.cover;
  return (
    <motion.div
      ref={ref}
      layout="position"
      variants={tileIn}
      initial="hidden"
      animate={seen ? 'show' : 'hidden'}
      exit="exit"
      transition={{ delay: Math.min(0.2, (index % 6) * 0.04) }}
    >
      <Tilt intensity={4} lift={3}>
        <button onClick={onOpen} className="ht-tile text-left" aria-label={post.title ?? 'Open note'}>
          <span className={cls('relative block overflow-hidden', hasCover ? 'aspect-[4/5]' : 'aspect-[4/3.2]')}>
            {hasCover ? (
              <img src={post.cover} alt="" loading="lazy" />
            ) : (
              <span
                className="grid h-full w-full place-items-center p-4 text-[13px] font-medium leading-snug text-ink-2"
                style={{
                  background:
                    'radial-gradient(120% 100% at 20% 0%, rgba(232,211,164,.14), transparent 60%), radial-gradient(100% 90% at 90% 100%, rgba(107,162,255,.12), transparent 60%), linear-gradient(160deg,#12141a,#08090c)',
                }}
              >
                {post.text?.slice(0, 110)}
              </span>
            )}
            <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.05) 36%,rgba(0,0,0,.88))' }} />
            <span className="absolute left-3 top-3 rounded-full border border-line-2 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/90 backdrop-blur-md">
              {post.kind === 'forge' ? `${post.minutes ?? 6} min` : 'note'}
            </span>
            {post.heatScore && post.heatScore.heat >= 60 && (
              <span className="absolute right-3 top-3 rounded-full border border-[rgba(232,211,164,.45)] bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#F7EAD0] backdrop-blur-md">
                {post.heatScore.heat}°
              </span>
            )}
            {post.title && (
              <span className="absolute inset-x-3 bottom-3 line-clamp-3 text-[13.5px] font-semibold leading-snug text-white">{post.title}</span>
            )}
          </span>
          <span className="flex items-center gap-2 px-1 py-2.5 text-[11.5px] text-ink-faint">
            <span className="truncate">{timeAgo(post.date)} ago</span>
            {post.origin === 'wire' && <span className="ht-chip !h-[20px] !px-2 !text-[10px]">Dev.to</span>}
          </span>
        </button>
      </Tilt>
    </motion.div>
  );
}

