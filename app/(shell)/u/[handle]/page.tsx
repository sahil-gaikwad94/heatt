'use client';
/* ============================================================================
   /u/[handle] — the profile.

   Structure follows the reference: a quiet bar, a centered portrait with
   floating stickers that drift with the gyroscope, the name, one inline row of
   follower counts, the bio as a single line, trait pills, then the work itself
   as a grid of tiles. In black, with none of the scoreboard.
   ==========================================================================*/

import * as React from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore, streakOf } from '@/lib/store';
import { getUser } from '@/lib/seed/users';
import { avatarDataUri, cls, compact, coverDataUri, prettyDate, timeAgo } from '@/lib/util';
import { PostCard } from '@/components/cards/PostCard';
import { HeatmapCard } from '@/components/heat/Heatmap';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { heatFor } from '@/lib/feed';
import { useTilt } from '@/lib/tilt';

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const app = useApp();
  const s = useStore();
  const handle = decodeURIComponent(params?.handle ?? s.me?.handle ?? 'you').replace(/^@/, '');
  const isMe = handle === (s.me?.handle ?? 'you') || handle === 'you';
  const user = isMe && s.me ? s.me : getUser(handle);
  const [editing, setEditing] = React.useState(false);
  const [tab, setTab] = React.useState<'all' | 'sparks' | 'forges'>('all');
  const [coverOk, setCoverOk] = React.useState(true);
  const tilt = useTilt();
  const { scrollY } = useScroll();
  const ambientY = useTransform(scrollY, [0, 260], [0, -40]);
  const ambientScale = useTransform(scrollY, [0, 260], [1.08, 1.2]);

  const posts = React.useMemo(() => {
    const mine = app.posts.filter((p) => p.authorHandle === handle).map((p) => ({ ...p, heat: p.heat ?? heatFor(p, s as any) }));
    // syndicated authors: synthesise their library from the wire for a real profile
    if (mine.length === 0) {
      const wire = app.wire.filter((w) => w.handle === handle);
      return wire.map((w) => {
        const p = {
          id: w.id,
          kind: 'forge' as const,
          origin: 'wire' as const,
          authorHandle: w.handle,
          authorName: w.author,
          authorAvatar: w.avatar,
          date: w.date,
          tags: w.tags,
          reactions: w.reactions,
          comments: w.comments,
          title: w.title,
          dek: w.dek,
          cover: w.cover,
          minutes: w.minutes,
          canonical: w.canonical,
          path: w.path,
        };
        return { ...p, heat: heatFor(p as any, s as any) };
      });
    }
    return mine.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [app.posts, handle, s, app.wire]);

  const filtered = posts.filter((p) => (tab === 'all' ? true : p.kind === (tab === 'sparks' ? 'spark' : 'forge')));
  const forges = posts.filter((p) => p.kind === 'forge');
  const sparks = posts.filter((p) => p.kind === 'spark');
  const followers = user.followers + (isMe ? 1 : 0);
  const streak = streakOf(s.activity);
  const cover = user.cover ?? (typeof window !== 'undefined' ? coverDataUri(handle) : undefined);

  return (
    <div className="mx-auto w-full max-w-[820px] pb-24 md:pb-10">
      {/* ------------------------------------------------------------- bar */}
      <div className="sticky top-0 z-30 -mx-4 flex h-[52px] items-center gap-2 px-4 sm:-mx-6 sm:px-6" style={{ paddingTop: 'max(6px, env(safe-area-inset-top))' }}>
        <button onClick={() => app.go('/feed')} className="ht-glass grid h-10 w-10 shrink-0 place-items-center !rounded-full text-[15px]" aria-label="Back">
          ←
        </button>
        <span className="ht-title flex-1 text-center text-[17px] text-white">Profile</span>
        <button onClick={() => app.setShare(`profile:${handle}`)} className="ht-glass grid h-10 w-10 shrink-0 place-items-center !rounded-full text-[15px]" aria-label="Share profile">
          ⋯
        </button>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <div className="relative -mx-4 -mt-[52px] sm:-mx-6">
        <div className="relative h-[240px] overflow-hidden">
          {cover && coverOk ? (
            <motion.img
              src={cover}
              alt=""
              onError={() => setCoverOk(false)}
              className="h-full w-full object-cover"
              style={{ y: ambientY, scale: ambientScale, filter: 'blur(2px) saturate(1.05) brightness(.7)' }}
            />
          ) : (
            <div className="h-full w-full" style={{ background: 'linear-gradient(150deg,#141414,#000)' }} />
          )}
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.65) 0%,rgba(0,0,0,.2) 35%,#000 96%)' }} />
        </div>
      </div>

      <div className="relative -mt-[86px] px-4 text-center sm:px-6">
        {/* portrait + floating stickers */}
        <div className="relative mx-auto grid h-[132px] w-[132px] place-items-center">
          <span aria-hidden className="absolute h-[150px] w-[150px] rounded-full blur-2xl" style={{ background: 'radial-gradient(circle,rgba(0,229,160,.42),transparent 70%)' }} />
          <img
            src={user.avatar ?? avatarDataUri(user.name, user.handle)}
            alt={user.name}
            onError={(e) => ((e.target as HTMLImageElement).src = avatarDataUri(user.name, user.handle))}
            className="relative h-[124px] w-[124px] rounded-full object-cover"
            style={{ boxShadow: '0 0 0 4px #000, 0 0 0 5px rgba(255,255,255,.14), 0 30px 70px -24px rgba(0,0,0,1)' }}
          />
          <Sticker glyph="🔥" label={`${streak.current} day streak`} className="-left-[38px] top-1" tilt={tilt} delay={0} />
          <Sticker glyph="✍️" label={`${forges.length} pieces written`} className="-right-[40px] top-[46px]" tilt={tilt} delay={0.7} />
          <Sticker glyph="📖" label={`${sparks.length} sparks`} className="-bottom-1 right-2" tilt={tilt} delay={1.3} />
        </div>

        <h1 className="ht-title mt-5 flex items-center justify-center gap-2 text-[30px] leading-none text-white">
          {user.name}
          {user.verified && (
            <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-black text-[#04140E]" style={{ background: 'linear-gradient(140deg,var(--ht-flare),var(--ht-jade))' }}>
              ✓
            </span>
          )}
        </h1>

        {/* one inline row, exactly like the reference */}
        <div className="mt-3 flex items-center justify-center gap-6 text-[13.5px]">
          <span className="text-ink-dim">
            <b className="ht-num text-[15px] text-white">{compact(followers)}</b> Followers
          </span>
          <span className="text-ink-dim">
            <b className="ht-num text-[15px] text-white">{compact(user.following)}</b> Following
          </span>
        </div>

        <p className="mx-auto mt-3 max-w-[54ch] text-[14px] leading-relaxed text-ink-dim">{user.bio}</p>
        <p className="mt-2 text-[12px] text-ink-faint">
          @{user.handle}
          {user.location ? ` · ${user.location}` : ''} · joined {prettyDate(user.joined)}
        </p>

        {/* trait pills */}
        {(user.traits ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(user.traits ?? []).map((tg) => (
              <button
                key={tg}
                onClick={() => app.go(`/explore?tag=${encodeURIComponent(tg)}`)}
                className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-ember-200 transition-colors hover:text-ember-100"
                style={{ background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.26)' }}
              >
                #{tg}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          {!isMe && (
            <button
              onClick={() => app.toggleFollow(user.handle)}
              className={cls('ht-btn', app.follows.includes(user.handle) ? '!px-5' : 'ht-btn--heat !px-7')}
            >
              {app.follows.includes(user.handle) ? 'Following ✓' : 'Follow'}
            </button>
          )}
          {isMe && (
            <button onClick={() => setEditing(true)} className="ht-btn ht-btn--heat !px-6">
              Edit profile
            </button>
          )}
          <button onClick={() => app.setShare(`profile:${handle}`)} className="ht-btn !px-5">
            Share
          </button>
        </div>

        {/* activity grid (yours only) */}
        {isMe && (
          <div className="mt-7 text-left">
            <HeatmapCard handle={handle} onOpen={() => app.go('/heatmap')} />
          </div>
        )}

        {/* ------------------------------------------------------- the work */}
        <div className="mt-8 text-left">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="ht-title text-[20px] text-white">{isMe ? 'Your writing' : `Writing by ${user.name.split(' ')[0]}`}</h2>
              <p className="mt-1 text-[12.5px] text-ink-mute">Public pieces on heatt. Everything reads in place.</p>
            </div>
            <div className="ht-no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto">
              {(['all', 'forges', 'sparks'] as const).map((x) => (
                <button
                  key={x}
                  onClick={() => setTab(x)}
                  className={cls(
                    'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors',
                    tab === x ? 'bg-[var(--ht-ember)] text-[#04140E]' : 'text-ink-mute hover:text-ink-dim'
                  )}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          {!isMe && posts.length === 0 && (
            <div className="ht-panel mt-4 p-6 text-center text-[13.5px] text-ink-mute">
              Nothing published from this handle yet. Follow and their next piece lands in your board.
            </div>
          )}

          {filtered.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <Tile key={p.id} post={p as any} onOpen={() => app.openPost(String(p.id))} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {filtered.length > 0 && (
            <p className="py-7 text-center text-[12px] text-ink-faint">
              {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'} · newest first
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>{editing && <ProfileEditor onClose={() => setEditing(false)} />}</AnimatePresence>
    </div>
  );
}

/* A floating, gyro-drifting sticker — the playful layer the reference has,
   rendered as glass and metal instead of cartoon. */
function Sticker({
  glyph,
  label,
  className,
  tilt,
  delay = 0,
}: {
  glyph: string;
  label: string;
  className: string;
  tilt: { x: number; y: number };
  delay?: number;
}) {
  return (
    <span
      title={label}
      className={cls('pointer-events-none absolute grid h-[46px] w-[46px] place-items-center rounded-full text-[19px]', className)}
      style={{
        transform: `translate3d(${tilt.x * 10}px, ${tilt.y * 8}px, 0)`,
        transition: 'transform .5s cubic-bezier(.22,1,.36,1)',
        background: 'linear-gradient(180deg, rgba(32,32,32,.94), rgba(8,8,8,.96))',
        border: '1px solid rgba(255,255,255,.14)',
        boxShadow: '0 18px 40px -18px rgba(0,0,0,1), 0 1px 0 rgba(255,255,255,.1) inset',
        animation: `badge-drift 7s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

/* One tile of the board: image first, title under it, a chip on the corner. */
function Tile({ post, onOpen }: { post: any; onOpen: () => void }) {
  const hasCover = !!post.cover;
  return (
    <motion.button
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      className="group block text-left"
    >
      <span className="relative block aspect-[4/5] overflow-hidden rounded-[22px] border border-white/[.07]">
        {hasCover ? (
          <img src={post.cover} alt="" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.07]" />
        ) : (
          <span
            className="grid h-full w-full place-items-center p-4 text-[13px] font-semibold leading-snug text-ink-dim"
            style={{ background: 'radial-gradient(120% 100% at 20% 0%, rgba(0,229,160,.16), transparent 60%), linear-gradient(160deg,#141414,#050505)' }}
          >
            {post.text?.slice(0, 90)}
          </span>
        )}
        <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.1) 40%,rgba(0,0,0,.82))' }} />
        <span className="absolute left-3 top-3 rounded-full border border-white/[.16] bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md">
          {post.kind === 'forge' ? `${post.minutes ?? 6} min` : 'spark'}
        </span>
        <span className="absolute inset-x-3 bottom-3 line-clamp-3 text-[13.5px] font-bold leading-snug text-white">
          {post.title ?? post.text?.slice(0, 80)}
        </span>
      </span>
      <span className="mt-2 block px-0.5 text-[11.5px] text-ink-faint">
        @{post.authorHandle} · {timeAgo(post.date)}
      </span>
    </motion.button>
  );
}
