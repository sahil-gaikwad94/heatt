'use client';
/* ============================================================================
   components/reader/ArticleReader — the reading environment.

   The whole file answers one question: can somebody finish a 2,000-word piece
   inside this app without leaving, without a redirect, without a layout shift,
   and without a single piece of chrome that is not earning its place?

     · obsidian paper, fluid type, a 68ch measure, 1.72 line-height
     · a 2px progress rail at the very top and nothing else pinned
     · chrome that fades in when you settle, and leaves when you scroll
     · keep · heat · share, and a byline that credits the real writer
     · resume: position is remembered per story, capped, never rounded down
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Markdown, parseMarkdown, type ParsedDoc } from '@/lib/markdown';
import type { ArticleBlock } from '@/lib/types';
import { Avatar } from '@/components/ui/primitives';
import { HeatButton } from '@/components/heat/HeatButton';
import { FireOverlay } from '@/components/heat/FireOverlay';
import { cls, compact, prettyDate, timeAgo } from '@/lib/util';
import { fetchBody } from '@/lib/syndicate';
import { EASE_OUT } from '@/lib/motion';
import type { Post } from '@/lib/feed';

export function ArticleReader({ post, onClose }: { post: Post; onClose: () => void }) {
  const app = useApp();
  const s = useStore();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = React.useState(0);
  const [syndicated, setSyndicated] = React.useState<{
    state: 'idle' | 'loading' | 'ok' | 'off';
    doc?: ParsedDoc;
    canonical?: string;
    author?: { name: string; handle: string; avatar?: string };
  }>({ state: 'idle' });
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [chrome, setChrome] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);

  const burning = !!app.igniting[post.id];
  const level = app.heatOf(post.id);
  const heat = post.heatScore?.heat ?? 0;
  const counts = app.countOf(post);
  const saved = !!s.saved[post.id];
  const mine = post.authorHandle === (s.me?.handle ?? 'you');

  const doc = React.useMemo(() => (post.markdown ? parseMarkdown(post.markdown) : null), [post.markdown]);

  const { scrollYProgress } = useScroll({ container: scrollRef });
  const railScale = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.4 });
  const barOpacity = useTransform(scrollYProgress, [0, 0.012, 0.985, 1], [0, 1, 1, 0.85]);

  /* ------------------------------------------------------- syndicated body */
  React.useEffect(() => {
    if (post.origin !== 'wire' || doc) return;
    let alive = true;
    setSyndicated((x) => ({ ...x, state: 'loading' }));
    fetchBody(post.id, { ...(post as unknown as Record<string, unknown>), author: post.authorName } as never).then((b) => {
      if (!alive) return;
      if (b.ok && b.markdown)
        setSyndicated({ state: 'ok', doc: parseMarkdown(b.markdown), canonical: b.canonical, author: b.author });
      else setSyndicated({ state: 'off', canonical: b.canonical, author: b.author });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, attempt]);

  const blocks: ArticleBlock[] | null = post.blocks ?? null;
  const md: ParsedDoc | null = doc ?? syndicated.doc ?? null;

  /* ------------------------------------------------ progress + persistence */
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    /* hand the page back to the reader at the point they left it — once */
    const savedPct = s.reads[post.id]?.pct ?? 0;
    if (savedPct > 4 && savedPct < 96) {
      window.setTimeout(() => {
        const max = el.scrollHeight - el.clientHeight;
        if (max > 200) el.scrollTo({ top: (savedPct / 100) * max, behavior: 'auto' });
      }, 60);
    }
    let raf = 0;
    let idle = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollHeight - el.clientHeight;
        const p = max > 40 ? Math.max(0, Math.min(100, (el.scrollTop / max) * 100)) : 100;
        setPct(p);
      });
      setChrome(false);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setChrome(true), 900);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  React.useEffect(() => {
    const t = window.setTimeout(() => useStore.getState().setRead(post.id, pct, post.minutes ?? 6), 400);
    return () => window.clearTimeout(t);
  }, [pct, post.id, post.minutes]);

  React.useEffect(() => {
    useStore.getState().setRead(post.id, pct, post.minutes ?? 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  /* ------------------------------------------------------------- shortcuts */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 's' || e.key === 'S') {
        useStore.getState().toggleSave(post.id);
        app.toast(!saved ? 'Kept in your library' : 'Removed from your library', !saved ? 'heat' : 'plain');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app, onClose, post.id, saved]);

  const authorName = syndicated.author?.name ?? post.authorName;
  const authorHandle = syndicated.author?.handle ?? post.authorHandle;
  const authorAvatar = syndicated.author?.avatar ?? post.authorAvatar;

  return (
    <div className="relative flex h-[100dvh] flex-col bg-void">
      {/* progress rail: two pixels, at the very top, always */}
      <div className="ht-progress-rail" role="progressbar" aria-label="Reading progress" aria-valuenow={Math.round(pct)}>
        <motion.span className="ht-progress-rail__fill block" style={{ scaleX: railScale, opacity: barOpacity }} />
      </div>

      {/* floating chrome — leaves while you read, returns when you settle */}
      <motion.header
        className="absolute inset-x-0 top-0 z-40 flex items-center gap-2 px-4 py-3"
        initial={false}
        animate={{ y: chrome ? 0 : -58, opacity: chrome ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ background: 'linear-gradient(180deg, rgba(6,7,10,.92), rgba(6,7,10,0))' }}
      >
        <button onClick={onClose} className="ht-icon-btn" aria-label="Close reader">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-ink-2">{post.title}</span>
          <span className="ht-num block text-[10.5px] text-ink-4">
            {Math.round(pct)}% · {Math.max(1, Math.round((post.minutes ?? 6) * (1 - pct / 100)))} min left
          </span>
        </span>
        <button onClick={() => setTypeOpen((v) => !v)} className="ht-icon-btn" aria-label="Reading settings" aria-expanded={typeOpen}>
          <span className="text-[13px] font-semibold" aria-hidden>
            Aa
          </span>
        </button>
        <button
          onClick={() => {
            useStore.getState().toggleSave(post.id);
            app.toast(!saved ? 'Kept in your library' : 'Removed from your library', !saved ? 'heat' : 'plain');
          }}
          className="ht-icon-btn"
          data-active={saved || undefined}
          aria-label={saved ? 'Remove from library' : 'Keep in library'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-3.8L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
        <button onClick={() => app.setShare(post.id)} className="ht-icon-btn" aria-label="Share as a story">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
          </svg>
        </button>
      </motion.header>

      <AnimatePresence>
        {typeOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="absolute right-4 top-[64px] z-40 w-[236px] p-3.5 ht-sheet"
          >
            <p className="ht-label mb-2 !text-[9px]">text size</p>
            <div className="ht-tabrail !p-1">
              {(['dense', 'normal', 'cozy'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => app.setPrefs({ density: d })}
                  aria-pressed={s.prefs.density === d}
                  className={cls('ht-tab !px-2.5 !text-[12px]', s.prefs.density === d && 'bg-white/[.08] text-ink')}
                >
                  {d === 'dense' ? 'A' : d === 'normal' ? 'A' : 'A'}
                  <span className="ht-ink-4">{d === 'dense' ? 's' : d === 'normal' ? 'm' : 'l'}</span>
                </button>
              ))}
            </div>
            <p className="ht-label mb-2 mt-3.5 !text-[9px]">measure</p>
            <div className="ht-tabrail !p-1">
              {(['narrow', 'normal', 'wide'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => app.setPrefs({ measure: m })}
                  aria-pressed={s.prefs.measure === m}
                  className={cls('ht-tab !px-2.5 !text-[12px]', s.prefs.measure === m && 'bg-white/[.08] text-ink')}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => app.setPrefs({ serif: !s.prefs.serif })}
              className="ht-btn ht-btn--quiet mt-3.5 !h-8 w-full !text-[12px]"
              aria-pressed={s.prefs.serif}
            >
              {s.prefs.serif ? 'Serif body · on' : 'Serif body · off'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------------------- text */}
      <div ref={scrollRef} className="ht-no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <article className="mx-auto w-full max-w-[var(--measure,760px)] px-5 pb-32 pt-[92px] sm:px-8">
          <header className="mb-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ht-chip ht-chip--heat">{post.minutes ?? 6} min read</span>
              {heat > 0 && <span className="ht-chip ht-chip--gold">{heat}° heat</span>}
              {post.origin === 'wire' && <span className="ht-chip">Dev.to</span>}
            </div>

            <h1 className="ht-display mt-5 text-[clamp(1.85rem,1.5rem+2.6vw,3.1rem)] text-ink">{post.title}</h1>
            {post.dek && <p className="ht-lead mt-4 max-w-[58ch] text-[15.5px]">{post.dek}</p>}

            <div className="mt-7 flex items-center gap-3 border-y border-line py-4">
              <Avatar name={authorName} handle={authorHandle} src={authorAvatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{authorName}</p>
                <p className="truncate text-[11.5px] text-ink-faint">
                  @{authorHandle} · {prettyDate(post.date)} · {timeAgo(post.date)} ago
                </p>
              </div>
              {!mine && (
                <button
                  onClick={() => app.toggleFollow(authorHandle)}
                  className={cls('ht-chip shrink-0', app.follows.includes(authorHandle) && 'ht-chip--heat')}
                >
                  {app.follows.includes(authorHandle) ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {post.cover && (
              <figure className="mt-7 overflow-hidden rounded-[var(--r-lg)] border border-line">
                <img src={post.cover} alt="" className="w-full object-cover" />
              </figure>
            )}
          </header>

          {post.origin === 'wire' && (!md || syndicated.state === 'loading') ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="ht-skeleton block h-4" style={{ width: `${70 + ((i * 7) % 28)}%` }} />
              ))}
            </div>
          ) : md ? (
            <Markdown doc={md} />
          ) : blocks ? (
            <Blocks blocks={blocks} />
          ) : (
            <div className="ht-panel p-6">
              <p className="text-[14px] text-ink-2">
                {post.text ?? 'This piece has no body yet.'}
              </p>
              {post.canonical && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a href={post.canonical} target="_blank" rel="noopener noreferrer" className="ht-btn ht-btn--quiet">
                    Read it on the original site ↗
                  </a>
                  <button onClick={() => setAttempt((a) => a + 1)} className="ht-btn ht-btn--ghost !px-3">
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- outro */}
          <footer className="mt-14 border-t border-line pt-7">
            <div className="flex flex-wrap items-center gap-3">
              <HeatButton level={level} count={counts.reactions} heat={heat} size="lg" onChange={(l, m) => app.setHeat(post.id, l, { title: post.title, author: authorHandle, ...m })} />
              <button
                onClick={() => app.setThread(post.id)}
                className="ht-btn ht-btn--quiet"
                aria-label={`${counts.comments} replies`}
              >
                {counts.comments} replies
              </button>
              <button onClick={() => app.setShare(post.id)} className="ht-btn ht-btn--heat">
                Share as a story
              </button>
              <span className="flex-1" />
              <button
                onClick={() => {
                  useStore.getState().toggleSave(post.id);
                  app.toast(!saved ? 'Kept in your library' : 'Removed from your library', !saved ? 'heat' : 'plain');
                }}
                className="ht-icon-btn"
                data-active={saved || undefined}
                aria-label={saved ? 'Remove from library' : 'Keep in library'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-3.8L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-[var(--r-lg)] border border-line bg-white/[.015] p-4">
              <Avatar name={authorName} handle={authorHandle} src={authorAvatar} size={44} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{authorName}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">
                  {post.origin === 'wire'
                    ? 'Published by ' + authorName + ' on Dev.to and syndicated here. The canonical version stays on their site.'
                    : post.origin === 'mine'
                      ? 'Written by you, on this device.'
                      : 'Written by the house for heatt Originals.'}
                </p>
                {post.canonical && (
                  <a href={post.canonical} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] text-ember-300 hover:text-ember-200">
                    Open the original ↗
                  </a>
                )}
              </div>
            </div>

            {post.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <button key={t} onClick={() => app.go(`/explore?q=${encodeURIComponent(t)}`)} className="ht-chip">
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </footer>
        </article>
      </div>

      <FireOverlay active={burning} variant="subtle" />
    </div>
  );
}

/* ------------------------------------------------------ structured blocks */

function Blocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="ht-prose">
      {blocks.map((b, i) => {
        if (b.t === 'h') return <h2 key={i} id={b.id}>{b.text}</h2>;
        if (b.t === 'p') return <p key={i}>{b.text}</p>;
        if (b.t === 'quote')
          return (
            <blockquote key={i}>
              {b.text}
              {b.cite && <cite>{b.cite}</cite>}
            </blockquote>
          );
        if (b.t === 'ul')
          return (
            <ul key={i}>
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          );
        if (b.t === 'ol')
          return (
            <ol key={i}>
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ol>
          );
        if (b.t === 'hr') return <hr key={i} />;
        if (b.t === 'img')
          return (
            <figure key={i}>
              <img src={b.src} alt={b.alt} />
              {(b.caption || b.credit) && <figcaption>{b.caption ?? b.credit}</figcaption>}
            </figure>
          );
        if (b.t === 'code') return <CodeBlock key={i} lang={b.lang} code={b.code} caption={b.caption} />;
        if (b.t === 'callout')
          return (
            <aside key={i} className="ht-block ht-block--warm my-7 rounded-[var(--r-md)] border border-line bg-white/[.02] p-4">
              <p className="ht-label !text-[9.5px] text-ember-300">{b.kind === 'heat' ? 'note on heat' : b.kind === 'warn' ? 'careful' : 'aside'}</p>
              <p className="mt-2 font-sans text-[14px] font-semibold text-ink">{b.title}</p>
              <p className="mt-1.5 font-sans text-[13.5px] leading-relaxed text-ink-dim">{b.text}</p>
            </aside>
          );
        if (b.t === 'links')
          return (
            <div key={i} className="my-7 space-y-2">
              {b.items.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border border-line px-4 py-3 transition-colors hover:border-line-2 hover:bg-white/[.02]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[13.5px] font-semibold text-ink">{l.label}</span>
                    {l.note && <span className="block truncate font-sans text-[12px] text-ink-4">{l.note}</span>}
                  </span>
                  <span className="shrink-0 text-ember-300">→</span>
                </a>
              ))}
            </div>
          );
        return null;
      })}
    </div>
  );
}

export { compact };

/** Article-block code with a language chip and an optional caption. */
function CodeBlock({ lang, code, caption }: { lang?: string; code: string; caption?: string }) {
  return (
    <div className="ht-codegroup">
      <div className="ht-codegroup__head">
        <span className="ht-num text-[10.5px] uppercase tracking-[0.12em] text-ink-4">{lang || 'code'}</span>
      </div>
      <pre className="ht-code">
        <code>
          {code.split('\n').map((line, i) => (
            <span key={i} className="ht-cline">
              <span className="ht-lineno" aria-hidden>
                {i + 1}
              </span>
              <span className="ht-linetext">{line}</span>
            </span>
          ))}
        </code>
      </pre>
      {caption && <p className="ht-caption">{caption}</p>}
    </div>
  );
}
