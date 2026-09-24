'use client';
/* ============================================================================
   components/shell — the frame.

   One sticky top bar (wordmark · search · you) and one floating pill dock that
   is the app's only primary navigation. On the reference language: a single
   dark capsule, the active destination marked with a filled circle, a
   champagne control for writing. Nothing else is pinned to the screen.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { cls } from '@/lib/util';
import { Avatar } from '@/components/ui/primitives';
import { EASE_OUT } from '@/lib/motion';
import type { Tab, RankMode } from '@/lib/feed';

/* ------------------------------------------------------------------- marks */

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" className="h-full w-full" role="img" aria-label="heatt">
        <defs>
          <linearGradient id="ht-mark" x1="0" y1="1" x2="0.8" y2="0">
            <stop offset="0" stopColor="#8F7A4E" />
            <stop offset="0.55" stopColor="#E8D3A4" />
            <stop offset="1" stopColor="#FFF8E6" />
          </linearGradient>
        </defs>
        <path
          d="M16.6 1.6c1.6 4.3.3 6.4-1.5 8.4-2 2.3-4.5 4.3-4.5 8.5a8.6 8.6 0 0 0 17.2.6c.1-3.4-1.9-5.7-2.7-8.9 2.2 2.6 3.7 5.5 3.7 9.1A12.4 12.4 0 0 1 16.6 30 12.4 12.4 0 0 1 4 17.7C4 9.8 11.5 5.5 16.6 1.6Z"
          transform="translate(-2.5 0)"
          fill="url(#ht-mark)"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ href = '/feed' }: { href?: string }) {
  return (
    <Link href={href} className="ht-wordmark" aria-label="heatt home">
      <LogoMark size={26} />
      <span className="hidden sm:block">heatt</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ topbar */

export function TopBar({
  title,
  sub,
  right,
  back,
}: {
  title?: string;
  sub?: string;
  right?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  const app = useApp();
  const [dense, setDense] = React.useState(false);

  React.useEffect(() => {
    const on = () => setDense(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="ht-topbar" data-dense={dense ? 'true' : 'false'}>
      <div className="ht-topbar__inner">
        {back ? (
          <Link href={back.href} className="ht-icon-btn" aria-label={back.label}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        ) : (
          <Wordmark />
        )}

        {title && (
          <div className="hidden min-w-0 flex-1 md:block">
            <h1 className="truncate text-[14.5px] font-semibold text-ink">{title}</h1>
            {sub && <p className="truncate text-[11.5px] text-ink-faint">{sub}</p>}
          </div>
        )}

        <span className="flex-1 md:hidden" />

        <button onClick={() => app.setPalette(true)} className="ht-topbar__search" aria-label="Search heatt">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.2-4.2" strokeLinecap="round" />
          </svg>
          <span>Search</span>
          <span className="ht-num ml-3 text-[10.5px] text-ink-4">⌘K</span>
        </button>

        {right}

        {/* signals: what came back on the things you put in the room */}
        <Link href="/notifications" className="ht-icon-btn" aria-label="Signals">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 8a6 6 0 1 0-12 0c0 4.5-1.5 6-1.5 6h15S18 12.5 18 8Z" />
            <path d="M10.3 20a2 2 0 0 0 3.4 0" />
          </svg>
        </Link>

        <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--heat hidden !h-9 !px-4 !text-[13px] sm:inline-flex">
          Write
        </button>

        <Link href={`/u/${app.me?.handle ?? 'you'}`} className="shrink-0" aria-label="Your profile">
          <Avatar name={app.me?.name ?? 'You'} handle={app.me?.handle ?? 'you'} src={app.me?.avatar} size={32} />
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- dock */

type Dest = { key: string; href: string; label: string; icon: React.ReactNode };

const FeedGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 6.5h16M4 12h16M4 17.5h10" />
  </svg>
);
const ExploreGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
const ShelfGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-3.8L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
  </svg>
);
const YouGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.2 20.4a7.8 7.8 0 0 1 15.6 0" />
  </svg>
);
const WireGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export function BottomDock() {
  const app = useApp();
  const path = usePathnameSafe();
  const handle = app.me?.handle ?? 'you';

  const dests: Dest[] = [
    { key: 'feed', href: '/feed', label: 'Board', icon: FeedGlyph },
    { key: 'explore', href: '/explore', label: 'Explore', icon: ExploreGlyph },
    { key: 'shelf', href: '/library', label: 'Library', icon: ShelfGlyph },
    { key: 'you', href: `/u/${handle}`, label: 'You', icon: YouGlyph },
  ];

  return (
    <nav className="ht-dock" aria-label="Primary">
      {dests.map((d) => {
        const active = d.key === 'you' ? path === `/u/${handle}` : path === d.href || path.startsWith(`${d.href}/`);
        return (
          <Link key={d.key} href={d.href} className="ht-dock-item" data-active={active || undefined} aria-current={active ? 'page' : undefined} title={d.label}>
            <span className="ht-dock-item__label" aria-hidden>
              {d.label}
            </span>
            {active && <motion.span layoutId="dock-active" className="ht-dock-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
            <span className="relative z-[1]">{d.icon}</span>
          </Link>
        );
      })}
      <span className="ht-dock-sep" aria-hidden />
      <button onClick={() => app.setComposer(true)} className="ht-dock-fab" aria-label="Write something">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </nav>
  );
}

/** The wire status + shortcuts, shown at the bottom of the board. */
export function WireStatus() {
  const app = useApp();
  return (
    <footer className="mt-14 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[12px] text-ink-faint">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: app.live ? '#6BA2FF' : '#454C5B',
              boxShadow: app.live ? '0 0 10px rgba(107,162,255,.9)' : undefined,
            }}
            aria-hidden
          />
          {app.live ? 'Wire connected · live stories from Dev.to' : 'Offline · showing the bundled library'}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-ink-4">
          <kbd className="ht-kbd">⌘K</kbd> search
          <kbd className="ht-kbd">S</kbd> save
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-4">
        <Link href="/library" className="hover:text-ink-2">Library</Link>
        <Link href="/explore" className="hover:text-ink-2">Explore</Link>
        <span className="ht-ink-4">heatt is written by the house, by real syndicated writers, and by you.</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------ page headers */

export function PageHead({
  eyebrow,
  title,
  dek,
  action,
}: {
  eyebrow?: string;
  title: string;
  dek?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 mt-7 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {eyebrow && <span className="ht-eyebrow">{eyebrow}</span>}
        <h1 className="ht-display mt-3 text-[clamp(1.9rem,1.5rem+2.4vw,3.1rem)] text-ink">{title}</h1>
        {dek && <p className="ht-lead mt-3 max-w-[54ch]">{dek}</p>}
      </div>
      {action}
    </header>
  );
}

/* -------------------------------------------------------------- feed tabs */

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'stories', label: 'Stories' },
  { key: 'notes', label: 'Notes' },
  { key: 'kept', label: 'Kept' },
];

const MODES: { key: RankMode; label: string }[] = [
  { key: 'for-you', label: 'For you' },
  { key: 'fresh', label: 'Newest' },
  { key: 'popular', label: 'Most heat' },
  { key: 'discussed', label: 'Most discussed' },
];

export function BoardControls() {
  const app = useApp();
  return (
    <div className="mb-5 flex items-center gap-2 overflow-x-auto ht-no-scrollbar">
      <div className="ht-tabrail" role="tablist" aria-label="Filter the board">
        {TABS.map((t) => {
          const active = app.tab === t.key;
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => app.setTab(t.key)} className="ht-tab">
              {active && (
                <motion.span layoutId="board-tab" className="absolute inset-0 rounded-full bg-white/[.08]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <span className="flex-1" />

      <div className="hidden shrink-0 items-center gap-1 sm:flex">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => app.setMode(m.key)}
            aria-pressed={app.mode === m.key}
            className={cls(
              'shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
              app.mode === m.key ? 'bg-white/[.08] text-ink' : 'text-ink-mute hover:text-ink-2'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ utils */

export function usePathnameSafe() {
  try {
    return usePathname() ?? '/';
  } catch {
    return '/';
  }
}

/** Shared "who is in the room" cluster used on the board header. */
export function AvatarCluster({ handles, max = 5 }: { handles: string[]; max?: number }) {
  const app = useApp();
  const shown = handles.slice(0, max);
  return (
    <span className="ht-cluster">
      {shown.map((h) => {
        const u = app.posts.find((p) => p.authorHandle === h)?.author;
        return (
          <span key={h} className="grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full bg-elev">
            <Avatar name={u?.name ?? h} handle={h} src={u?.avatar} size={30} />
          </span>
        );
      })}
      {handles.length > max && <span className="ht-cluster__more">+{handles.length - max}</span>}
    </span>
  );
}

export { EASE_OUT };
