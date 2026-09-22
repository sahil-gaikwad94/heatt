'use client';
/* ============================================================================
   /u/[handle] — the profile: cover, avatar, bio, thermal stats, tabs,
   the heat-map widget (collapsed → expanded), and full editing when it's you.
   ==========================================================================*/

import * as React from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore, streakOf } from '@/lib/store';
import { getUser, SEED_USERS } from '@/lib/seed/users';
import { avatarDataUri, cls, compact, coverDataUri, prettyDate } from '@/lib/util';
import { Avatar, Sparkline } from '@/components/ui/primitives';
import { PostCard } from '@/components/cards/PostCard';
import { HeatmapCard } from '@/components/heat/Heatmap';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { heatFor } from '@/lib/feed';
import { tempLabel, kelvin } from '@/lib/heat';

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const app = useApp();
  const s = useStore();
  const handle = decodeURIComponent(params?.handle ?? s.me?.handle ?? 'you').replace(/^@/, '');
  const isMe = handle === (s.me?.handle ?? 'you') || handle === 'you';
  const user = isMe && s.me ? s.me : getUser(handle);
  const [editing, setEditing] = React.useState(false);
  const [tab, setTab] = React.useState<'all' | 'sparks' | 'forges' | 'heated'>('all');
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 320], [0, -46]);
  const coverScale = useTransform(scrollY, [0, 320], [1.06, 1.2]);
  const [coverOk, setCoverOk] = React.useState(true);

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
    return mine.sort((a, b) => (b.heat!.score ?? 0) - (a.heat!.score ?? 0));
  }, [app.posts, handle, s, app.wire]);

  const filtered = posts.filter((p) =>
    tab === 'all' ? true : tab === 'heated' ? (s.heat[p.id]?.level ?? 0) > 0 : p.kind === (tab === 'sparks' ? 'spark' : 'forge')
  );
  const forges = posts.filter((p) => p.kind === 'forge');
  const sparks = posts.filter((p) => p.kind === 'spark');
  const heatSum = posts.reduce((a, p) => a + (p.heat?.temp ?? 0), 0);
  const streak = streakOf(s.activity);
  const followers = user.followers + (isMe ? 1 : 0);
  const cover = user.cover ?? (typeof window !== 'undefined' ? coverDataUri(handle) : undefined);

  return (
    <div className="mx-auto w-full max-w-[760px] pb-8">
      {/* ------------------------------------------------------------ cover */}
      <div className="relative -mx-4 -mt-px h-[196px] overflow-hidden sm:-mx-6 sm:h-[240px]" style={{ background: 'linear-gradient(140deg,#15151b,#0a0a0d)' }}>
        {cover && coverOk ? (
          <motion.img
            src={cover}
            alt=""
            onError={() => setCoverOk(false)}
            className="h-full w-full object-cover"
            style={{ y: coverY, scale: coverScale, filter: 'saturate(1.05)' }}
          />
        ) : (
          <motion.div className="h-full w-full" style={{ y: coverY }} />
        )}
        <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(8,8,10,.35),rgba(8,8,10,.94))' }} />
        <div className="absolute left-4 top-4 flex gap-2">
          <button onClick={() => app.go('/feed')} className="ht-btn ht-btn--ghost !px-2.5 !py-1.5 !bg-black/40 backdrop-blur-md md:hidden">
            ←
          </button>
        </div>
        <div className="absolute right-4 top-4 flex gap-2">
          <button onClick={() => app.setShare(`profile:${handle}`)} className="ht-btn !py-1.5 !text-[12px] !bg-black/45 backdrop-blur-md">
            Share profile
          </button>
          {isMe && (
            <button onClick={() => setEditing(true)} className="ht-btn ht-btn--heat !py-1.5 !text-[12px]">
              Edit profile
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ identity */}
      <div className="relative px-4 sm:px-6">
        <div className="-mt-12 flex items-end justify-between gap-4">
          <div className="relative">
            <span className="absolute -inset-1 rounded-full blur-md" style={{ background: 'linear-gradient(140deg,rgba(255,181,49,.6),rgba(255,45,18,.45))' }} aria-hidden />
            <img
              src={user.avatar ?? avatarDataUri(user.name, user.handle)}
              alt={user.name}
              onError={(e) => ((e.target as HTMLImageElement).src = avatarDataUri(user.name, user.handle))}
              className="relative h-[92px] w-[92px] rounded-full border-[3px] border-[#0a0a0c] object-cover"
              style={{ boxShadow: '0 18px 50px -18px rgba(0,0,0,1)' }}
            />
            {heatSum > 40 && (
              <span className="absolute -bottom-1 -right-1 rounded-full border border-ember-500/50 bg-[#170d07] px-2 py-[2px] text-[10px] font-black uppercase tracking-[0.1em] text-ember-200">
                {tempLabel(heatSum / Math.max(1, posts.length)).label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pb-1">
            {!isMe && (
              <button
                onClick={() => app.toggleFollow(user.handle)}
                className={cls('ht-btn', app.follows.includes(user.handle) ? '' : 'ht-btn--heat')}
              >
                {app.follows.includes(user.handle) ? 'Following ✓' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h1 className="ht-title flex items-center gap-2 text-[24px]">
            {user.name}
            {user.verified && <span className="grid h-5 w-5 place-items-center rounded-full bg-[linear-gradient(140deg,#FFD27D,#FF5C0A)] text-[10px] font-black text-[#170a03]">✓</span>}
          </h1>
          <p className="text-[14px] text-ink-mute">@{user.handle}</p>
          <p className="mt-2.5 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-dim">{user.bio}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-mute">
            {user.location && <span>📍 {user.location}</span>}
            {user.site && (
              <a href={user.site.startsWith('http') ? user.site : `https://${user.site}`} target="_blank" rel="noopener noreferrer" className="text-cryo-teal hover:underline">
                {user.site}
              </a>
            )}
            <span>Joined {prettyDate(user.joined)}</span>
            {user.org && <span className="ht-chip !normal-case !tracking-normal">{user.org}</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(user.traits ?? []).map((tg) => (
              <button key={tg} onClick={() => app.go(`/explore?tag=${encodeURIComponent(tg)}`)} className="ht-chip !normal-case !tracking-normal">
                #{tg}
              </button>
            ))}
          </div>

          {/* stats row */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="forgings" value={String(forges.length)} sub={`${posts.reduce((a, p) => a + (p.minutes ?? 0), 0)} min of text`} />
            <Stat label="sparks" value={String(sparks.length)} sub="short-form" />
            <Stat
              label="total heat"
              value={kelvin(heatSum / Math.max(1, posts.length)).replace('K', '°')}
              sub={tempLabel(heatSum / Math.max(1, posts.length)).label}
              accent
            />
            <Stat label="thermal mass" value={user.thermalMass.toFixed(2)} sub={isMe ? `${streak.current}d streak` : 'reputation weight'} />
          </div>

          <div className="mt-2 flex items-center gap-4 text-[13px]">
            <span>
              <b className="ht-num text-[15px]">{compact(followers)}</b> <span className="text-ink-mute">Followers</span>
            </span>
            <span>
              <b className="ht-num text-[15px]">{compact(user.following)}</b> <span className="text-ink-mute">Following</span>
            </span>
            <span className="flex-1" />
            <span className="hidden sm:block">
              <Sparkline values={trendFor(posts)} w={92} h={22} color="var(--ht-flame)" />
            </span>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-5 flex gap-1 border-b border-white/[.07]">
          {(['all', 'sparks', 'forges', 'heated'] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={cls('relative px-3.5 py-2.5 text-[13.5px] font-bold capitalize transition-colors', tab === x ? 'text-ink' : 'text-ink-mute hover:text-ink-dim')}
            >
              {x === 'heated' ? 'Heated by you' : x}
              {tab === x && <motion.span layoutId="prof-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare))', boxShadow: '0 0 12px rgba(255,92,10,.9)' }} />}
            </button>
          ))}
        </div>

        {/* heat map (mine only) */}
        {isMe && (
          <div className="mt-4">
            <HeatmapCard handle={handle} onOpen={() => app.go('/heatmap')} />
          </div>
        )}

        {!isMe && posts.length === 0 && (
          <div className="ht-panel mt-4 p-6 text-center text-[13.5px] text-ink-mute">
            This account has nothing heated yet. Handle is real on the wire — follow to see new work arrive.
          </div>
        )}

        <div className="mt-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <PostCard key={p.id} post={p as any} index={i} />
            ))}
          </AnimatePresence>
          {filtered.length > 0 && (
            <p className="py-6 text-center text-[12px] text-ink-faint">
              {filtered.length} item{filtered.length === 1 ? '' : 's'} · heat-weighted, newest first
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>{editing && <ProfileEditor onClose={() => setEditing(false)} />}</AnimatePresence>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] border border-white/[.06] bg-white/[.017] p-3">
      <span className="ht-label !text-[9px]">{label}</span>
      <div className={cls('ht-num mt-0.5 text-[19px] font-black leading-none', accent ? 'ht-heat-text' : 'text-ink')}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-ink-faint">{sub}</div>}
    </div>
  );
}

function trendFor(posts: { heat?: { temp: number } }[]) {
  const out = new Array(7).fill(0);
  posts.forEach((p, i) => {
    out[i % 7] += p.heat?.temp ?? 0;
  });
  return out.map((v) => Math.round(v));
}
