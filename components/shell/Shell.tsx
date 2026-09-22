'use client';
/* ============================================================================
   components/shell — the app frame.

   Left: navigation rail with a heat indicator per destination.
   Right: a live "board is burning" rail — the ranker made visible, plus your
   streak and syndication status. On mobile the rail collapses to a tab bar
   with a molten FAB and the right rail moves into /explore.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { getUser } from '@/lib/seed/users';
import { cls, compact, timeAgo } from '@/lib/util';
import { Avatar, Sparkline } from '@/components/ui/primitives';
import { WaveBars } from '@/components/cards/PostCard';
import { waveformFor } from '@/lib/feed';

export type NavKey = 'feed' | 'explore' | 'notifications' | 'library' | 'heatmap' | 'profile' | 'settings';

const NAV: { key: NavKey; href: string; label: string; hint: string; icon: (a: { color: string }) => React.ReactNode }[] = [
  { key: 'feed', href: '/feed', label: 'Feed', hint: 'g f', icon: (p) => <Icon d="M4 5h16M4 12h16M4 19h10" {...p} /> },
  { key: 'explore', href: '/explore', label: 'Explore', hint: 'g e', icon: (p) => <Icon d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM20 20l-4.2-4.2" {...p} /> },
  { key: 'notifications', href: '/notifications', label: 'Notifications', hint: 'heat events', icon: (p) => <Icon d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 20a2 2 0 0 0 3.4 0" {...p} /> },
  { key: 'library', href: '/library', label: 'Library', hint: 'g l', icon: (p) => <Icon d="M5 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5ZM19 4h-1.5A2.5 2.5 0 0 0 15 6.5V20a2.5 2.5 0 0 1 2.5-2.5H19Z" {...p} /> },
  { key: 'heatmap', href: '/heatmap', label: 'Heat map', hint: 'g h', icon: (p) => <Icon d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4z" {...p} /> },
  { key: 'profile', href: '/u/you', label: 'Profile', hint: 'g p', icon: (p) => <Icon d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.2 20.4a7.8 7.8 0 0 1 15.6 0" {...p} /> },
  { key: 'settings', href: '/settings', label: 'Settings', hint: 'prefs', icon: (p) => <Icon d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2a8 8 0 0 0-.15-1.5l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.6-1.5L14.5 2h-4l-.45 2.6a8 8 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.6 1.5l.45 2.6h4l.45-2.6a8 8 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5c.1-.5.15-1 .15-1.5Z" {...p} /> },
];

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  );
}

export function NavRail() {
  const app = useApp();
  const me = app.me;
  const unread = app.notifications.filter((n) => !n.read).length;
  const heat = useStore((s) => Object.values(s.heat).reduce((a: number, h: any) => a + (h?.level ?? 0), 0));
  const path = usePathnameSafe();

  return (
    <nav className="sticky top-0 hidden h-[100dvh] w-[76px] shrink-0 flex-col items-center gap-1 border-r border-white/[.05] bg-black/25 py-4 backdrop-blur-xl md:flex xl:w-[236px] xl:items-stretch xl:px-4">
      <Link href="/feed" className="mb-3 flex items-center gap-2 px-1 xl:px-2" aria-label="heatt home">
        <Logo />
        <span className="ht-title ht-heat-text hidden text-[23px] leading-none xl:block">heatt</span>
      </Link>

      {NAV.map((item) => {
        const active = item.key === 'profile' ? path.startsWith(`/u/${me?.handle ?? 'you'}`) : path === item.href || path.startsWith(`${item.href}/`);
        return <NavItem key={item.key} item={item} active={active} badge={item.key === 'notifications' ? unread : 0} />;
      })}

      <button
        onClick={() => app.setComposer(true)}
        className="ht-btn ht-btn--heat mt-3 hidden h-[46px] w-full !rounded-full xl:flex"
        style={{ fontSize: 15 }}
      >
        <ForgeGlyph /> Compose
      </button>
      <button
        onClick={() => app.setComposer(true)}
        className="ht-btn ht-btn--heat mt-2 grid h-[46px] w-[46px] place-items-center !rounded-full xl:hidden"
        aria-label="Compose"
      >
        <ForgeGlyph />
      </button>

      <div className="mt-auto hidden min-w-0 xl:block">
        <div className="rounded-[16px] border border-white/[.06] bg-white/[.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="ht-label !text-[9px]">session heat</span>
            <span className="ht-num text-[11px] font-bold text-ember-300">{heat}</span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-ink-mute">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: app.live ? '#2BE0C8' : '#6E6A66', boxShadow: app.live ? '0 0 10px #2BE0C8' : undefined }} />
            {app.live ? 'wire: live' : 'wire: snapshot'}
          </div>
        </div>
        <Link href={me ? `/u/${me.handle}` : '/settings'} className="mt-2 flex items-center gap-2.5 rounded-[16px] p-2 transition-colors hover:bg-white/[.04]">
          <Avatar name={me?.name ?? 'Guest'} handle={me?.handle ?? 'guest'} src={me?.avatar} size={34} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-ink">{me?.name ?? 'Guest'}</span>
            <span className="block truncate text-[11.5px] text-ink-mute">@{me?.handle ?? 'guest'}</span>
          </span>
        </Link>
      </div>
    </nav>
  );

}

function usePathnameSafe() {
  try {
    return usePathname() ?? '/';
  } catch {
    return '/';
  }
}

function NavItem({ item, active, badge }: { item: (typeof NAV)[number]; active: boolean; badge: number }) {
  return (
    <Link
      href={item.href === '/u/you' ? `/u/${useApp().me?.handle ?? 'you'}` : item.href}
      className="group/nav relative flex items-center gap-3.5 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-white/[.045] xl:mx-[-4px]"
      title={`${item.label} · ${item.hint}`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute left-0 top-1/2 hidden h-[22px] w-[3px] -translate-y-1/2 rounded-r-full xl:block"
          style={{ background: 'linear-gradient(180deg,var(--ht-flare),var(--ht-magma))', boxShadow: '0 0 14px rgba(255,92,10,.9)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
      <span className="relative mx-auto xl:mx-0" style={{ color: active ? 'var(--ht-flame)' : 'var(--ht-ink-dim)' }}>
        {item.icon({ color: 'currentColor' })}
        {badge > 0 && (
          <span className="ht-num absolute -right-2 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full px-[3px] text-[9px] font-black text-[#170a03]" style={{ background: 'linear-gradient(120deg,var(--ht-flare),var(--ht-magma))' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={cls('hidden flex-1 text-[15px] font-semibold tracking-[-0.01em] xl:block', active ? 'text-ink' : 'text-ink-dim')}>{item.label}</span>
      <span className="ht-label hidden text-[9px] opacity-0 transition-opacity group-hover/nav:opacity-100 xl:block">{item.hint}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ right rail */

export function RightRail() {
  const app = useApp();
  const s = useStore();
  const board = React.useMemo(() => [...app.posts].sort((a, b) => (b.heat?.temp ?? 0) - (a.heat?.temp ?? 0)).slice(0, 6), [app.posts]);
  const suggested = React.useMemo(() => {
    const known = new Set([...app.follows, app.me?.handle]);
    return app.posts
      .map((p) => p.authorHandle)
      .filter((h, i, arr) => !known.has(h) && arr.indexOf(h) === i)
      .slice(0, 3)
      .map(getUser);
  }, [app.posts, app.follows, app.me]);

  const today = s.activity[new Date().toISOString().slice(0, 10)];

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[330px] shrink-0 overflow-y-auto overscroll-contain border-l border-white/[.05] px-5 py-5 backdrop-blur-sm xl:block ht-no-scrollbar">
      <section className="ht-panel p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="ht-title text-[15px] text-ink">The board is burning</h2>
          <span className="ht-chip !border-transparent !bg-ember-500/12 !text-[9px] !text-ember-200">heat diffusion</span>
        </header>
        <ol className="space-y-2.5">
          {board.map((p, i) => (
            <li key={p.id}>
              <button onClick={() => app.openPost(p.id)} className="group/row flex w-full items-start gap-2.5 text-left">
                <span className="ht-num mt-[3px] w-3 shrink-0 text-[11px] font-bold text-ember-500/80">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-dim transition-colors group-hover/row:text-ink">
                    {p.title ?? p.text?.slice(0, 90)}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-ink-mute">@{p.authorHandle}</span>
                    <span className="ht-num text-[10.5px] font-bold" style={{ color: `hsl(${8 + (p.heat?.heat ?? 0) * 0.4} 100% ${52 + (p.heat?.heat ?? 0) * 0.16}%)` }}>
                      {Math.round(p.heat?.temp ?? 0)}°
                    </span>
                    <span className="flex-1 opacity-70">
                      <WaveBars values={waveformFor(p, s)} h={9} />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="ht-panel mt-4 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="ht-title text-[15px]">Your streak</h2>
          <span className="ht-num text-[11px] text-ink-mute">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </header>
        <div className="flex items-end gap-3">
          <span className="ht-title ht-heat-text text-[38px] leading-none">{app.streak.current}</span>
          <span className="pb-1 text-[12px] text-ink-mute">
            days lit
            <br />
            <span className="text-ink-faint">best {app.streak.longest}</span>
          </span>
          <span className="flex-1" />
          <MiniGrid activity={s.activity} />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-mute">
          {today
            ? `Today: ${today.reads} read${today.reads === 1 ? '' : 's'}, ${today.heats} heats, ${today.ignites} ignition${today.ignites === 1 ? '' : 's'}, ${today.posts} post${today.posts === 1 ? '' : 's'}.`
            : 'Nothing logged today. One heat is enough to keep the grid lit.'}
        </p>
        <Link href="/heatmap" className="ht-btn mt-3 w-full !py-2 !text-[12.5px]">
          Open heat dashboard →
        </Link>
      </section>

      {suggested.length > 0 && (
        <section className="ht-panel mt-4 p-4">
          <h2 className="ht-title mb-3 text-[15px]">High thermal mass</h2>
          <div className="space-y-3">
            {suggested.map((u) => (
              <div key={u.handle} className="flex items-center gap-2.5">
                <Link href={`/u/${u.handle}`}>
                  <Avatar name={u.name} handle={u.handle} src={u.avatar} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${u.handle}`} className="block truncate text-[13px] font-bold hover:underline">
                    {u.name}
                  </Link>
                  <span className="block truncate text-[11.5px] text-ink-mute">mass {u.thermalMass.toFixed(2)} · {compact(u.followers)}</span>
                </div>
                <button onClick={() => app.toggleFollow(u.handle)} className={cls('ht-btn !px-3 !py-1.5 !text-[11.5px]', app.follows.includes(u.handle) && '!border-ember-500/40 !text-ember-200')}>
                  {app.follows.includes(u.handle) ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-[18px] border border-white/[.06] p-3.5 text-[11.5px] leading-relaxed text-ink-faint">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: app.live ? '#2BE0C8' : '#FF8A1F' }} />
          <span className="ht-label !text-[9px]">syndication</span>
        </div>
        {app.live ? (
          <>Wire is live: free public long-form from the Forem API, refreshed with stale-while-revalidate. Bodies render natively — no redirects.</>
        ) : (
          <>Wire unreachable from here, so the bundled library is serving the board. Everything still reads in-app, fully formatted.</>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span>{app.wire.length} syndicated · {app.posts.length} total</span>
          <button onClick={() => app.refresh(true)} className="ht-btn ht-btn--ghost !py-1 !text-[11px]">
            Refresh
          </button>
        </div>
      </section>
    </aside>
  );
}

export function MiniGrid({ activity, days = 35 }: { activity: Record<string, any>; days?: number }) {
  const cells = React.useMemo(() => {
    const out: { key: string; v: number }[] = [];
    const t = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(t.getTime() - i * 86400000).toISOString().slice(0, 10);
      const a = activity[d];
      const v = a ? Math.min(1, (a.reads + a.heats + a.ignites * 2 + a.posts * 2) / 8) : 0;
      out.push({ key: d, v });
    }
    return out;
  }, [activity, days]);
  return (
    <span className="grid grid-cols-7 gap-[3px]" aria-hidden>
      {cells.map((c) => (
        <span
          key={c.key}
          className="h-[7px] w-[7px] rounded-[2px]"
          style={{
            background: c.v > 0 ? `hsl(${18 - c.v * 12} 100% ${28 + c.v * 42}%)` : 'rgba(255,255,255,.055)',
            boxShadow: c.v > 0.55 ? `0 0 8px hsl(14 100% 52% / ${c.v * 0.8})` : undefined,
          }}
        />
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------- mobile bar */

export function MobileTabs() {
  const app = useApp();
  const path = usePathnameSafe();
  const me = app.me;
  const items: { key: NavKey; href: string; label: string }[] = [
    { key: 'feed', href: '/feed', label: 'Feed' },
    { key: 'explore', href: '/explore', label: 'Explore' },
    { key: 'notifications', href: '/notifications', label: 'Heat' },
    { key: 'library', href: '/library', label: 'Library' },
    { key: 'profile', href: `/u/${me?.handle ?? 'you'}`, label: 'You' },
  ];
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-white/[.07] bg-[#08080a]/88 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden">
        {items.map((it) => {
          const active = it.key === 'profile' ? path.startsWith('/u/') : path === it.href;
          return (
            <Link
              key={it.key}
              href={it.href}
              className={cls('relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] transition-colors', active ? 'text-ember-300' : 'text-ink-mute')}
            >
              {active && (
                <motion.span layoutId="mtab" className="absolute -top-px h-[2px] w-10 rounded-full" style={{ background: 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare))', boxShadow: '0 0 12px rgba(255,92,10,.9)' }} />
              )}
              {it.key === 'notifications' && app.notifications.some((n) => !n.read) && (
                <span className="absolute right-[22%] top-1.5 h-1.5 w-1.5 rounded-full bg-cryo-teal shadow-[0_0_8px_#2BE0C8]" />
              )}
              {it.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => app.setComposer(true)}
        className="fixed bottom-[86px] right-4 z-50 grid h-[54px] w-[54px] place-items-center rounded-full text-[#170a03] md:hidden"
        style={{ background: 'linear-gradient(140deg,var(--ht-flare),var(--ht-ember) 45%,var(--ht-magma))', boxShadow: '0 16px 44px -12px rgba(255,92,10,.85)' }}
        aria-label="Compose"
      >
        <ForgeGlyph />
      </button>
    </>
  );
}

export function TopBar({ title, sub, right }: { title?: string; sub?: string; right?: React.ReactNode }) {
  const app = useApp();
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div
      className={cls(
        'sticky top-0 z-40 -mx-4 mb-3 border-b px-4 backdrop-blur-xl transition-all sm:-mx-6 sm:px-6',
        scrolled ? 'border-white/[.07] bg-[#08080a]/80' : 'border-transparent'
      )}
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
    >
      <div className="flex h-[52px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="ht-title truncate text-[19px] leading-tight">{title ?? 'Feed'}</h1>
            {sub && <span className="truncate text-[12px] text-ink-mute">{sub}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {right}
          <button onClick={() => app.setPalette(true)} className="ht-btn ht-btn--ghost !px-2.5" aria-label="Search and commands">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.2-4.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <span className="relative grid h-[30px] w-[30px] shrink-0 place-items-center">
      <svg viewBox="0 0 32 32" className="h-full w-full" aria-label="heatt">
        <defs>
          <linearGradient id="htlogo" x1="0" y1="1" x2="0.7" y2="0">
            <stop offset="0" stopColor="#FF2D12" />
            <stop offset="0.5" stopColor="#FF8A1F" />
            <stop offset="1" stopColor="#FFF6DE" />
          </linearGradient>
        </defs>
        <path
          d="M16.6 1.6c1.6 4.3.3 6.4-1.5 8.4-2 2.3-4.5 4.3-4.5 8.5a8.6 8.6 0 0 0 17.2.6c.1-3.4-1.9-5.7-2.7-8.9 2.2 2.6 3.7 5.5 3.7 9.1A12.4 12.4 0 0 1 16.6 30 12.4 12.4 0 0 1 4 17.7C4 9.8 11.5 5.5 16.6 1.6Z"
          transform="translate(-2.5 0)"
          fill="url(#htlogo)"
        />
      </svg>
      <span aria-hidden className="absolute inset-0 -z-10 rounded-full blur-lg" style={{ background: 'radial-gradient(circle,rgba(255,92,10,.55),transparent 70%)' }} />
    </span>
  );
}

function ForgeGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function FeedTabs() {
  const app = useApp();
  const tabs: { key: any; label: string }[] = [
    { key: 'for-you', label: 'For you' },
    { key: 'sparks', label: 'Sparks' },
    { key: 'forges', label: 'Forges' },
    { key: 'following', label: 'Following' },
    { key: 'library', label: 'Library' },
  ];
  const modes: { key: any; label: string }[] = [
    { key: 'heat', label: 'Heat' },
    { key: 'new', label: 'New' },
    { key: 'top', label: 'Top' },
    { key: 'contested', label: 'Contested' },
  ];
  return (
    <div className="sticky top-[52px] z-30 -mx-4 mb-4 border-b border-white/[.06] bg-[#08080a]/72 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-1 overflow-x-auto ht-no-scrollbar">
        {tabs.map((t) => {
          const active = app.tab === t.key;
          return (
            <button key={t.key} onClick={() => app.setTab(t.key)} className={cls('relative shrink-0 px-3 py-2.5 text-[13.5px] font-bold tracking-[-0.01em] transition-colors', active ? 'text-ink' : 'text-ink-mute hover:text-ink-dim')}>
              {t.label}
              {active && <motion.span layoutId="feedtab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare))', boxShadow: '0 0 12px rgba(255,92,10,.85)' }} />}
            </button>
          );
        })}
        <span className="flex-1" />
        <div className="hidden shrink-0 items-center gap-1 pr-1 sm:flex">
          {modes.map((m) => (
            <button key={m.key} onClick={() => app.setMode(m.key)} className={cls('ht-chip !normal-case !tracking-normal !text-[10.5px]', app.mode === m.key && '!border-ember-500/50 !bg-ember-500/10 !text-ember-200')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
