'use client';
/* ============================================================================
   components/reader/ArticleReader — the full-article environment.

   Everything about this file exists to answer one question: can someone finish
   a 2,000-word piece inside a social app without leaving, without layout
   shift, without a single missing image, and with the crowd's attention
   visible beside the text?

   • fluid type via clamp(), 3 densities, serif↔sans, measure control
   • heat-warmed progress bar (cool at the top → white-hot at 100%)
   • Heat Spine: per-paragraph crowd heat, click to jump, hold to heat a paragraph
   • attribution card for syndicated pieces + "Read original" (new tab only)
   • resume: reading position is persisted per article
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Markdown, parseMarkdown, type ParsedDoc } from '@/lib/markdown';
import { paraKey, waveformFor } from '@/lib/feed';
import type { ArticleBlock } from '@/lib/types';
import { CodeBlock } from '@/lib/markdown';
import { Avatar, Sparkline } from '@/components/ui/primitives';
import { HeatButton } from '@/components/heat/HeatButton';
import { FireOverlay, EmberTrail } from '@/components/heat/FireOverlay';
import { cls, compact, prettyDate, timeAgo } from '@/lib/util';
import { getUser } from '@/lib/seed/users';
import { fetchBody } from '@/lib/syndicate';
import type { Post } from '@/lib/feed';
import { tempLabel, kelvin } from '@/lib/heat';

export function ArticleReader({ post, onClose }: { post: Post; onClose: () => void }) {
  const app = useApp();
  const s = useStore();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const blockEls = React.useRef<Map<number, HTMLElement>>(new Map());
  const [pct, setPct] = React.useState(0);
  const [start] = React.useState(() => Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [syndicated, setSyndicated] = React.useState<{ state: 'idle' | 'loading' | 'ok' | 'off'; doc?: ParsedDoc; meta?: any }>({ state: 'idle' });
  const [panel, setPanel] = React.useState<null | 'type'>(null);
  const burning = !!app.igniting[post.id];
  const level = app.heatOf(post.id);
  const heat = post.heat!;
  const t = tempLabel(heat.temp);
  const wave = React.useMemo(() => waveformFor(post, s), [post, s]);
  const paraHeats = React.useMemo(() => {
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(s.heat)) {
      if (k.startsWith(`${post.id}:p`)) out[Number(k.slice(post.id.length + 2))] = v.level;
    }
    return out;
  }, [s.heat, post.id]);

  const doc = React.useMemo(() => (post.markdown ? parseMarkdown(post.markdown) : null), [post.markdown]);

  /* syndicated body, fetched per view and cached ephemerally (spec §6.2) */
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (post.origin !== 'wire' || doc) return;
    let alive = true;
    setSyndicated((x) => ({ ...x, state: 'loading' }));
    fetchBody(post.id, { ...(post as any), id: post.id } as any).then((b: any) => {
      if (!alive) return;
      if (b.ok && b.markdown) setSyndicated({ state: 'ok', doc: parseMarkdown(b.markdown), meta: b });
      else setSyndicated({ state: 'off', meta: b });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, attempt]);

  const blocks: ArticleBlock[] | null = post.blocks ?? null;
  const md: ParsedDoc | null = doc ?? syndicated.doc ?? null;
  const blockCount = blocks?.length ?? md?.blocks ?? 12;

  /* ------------------------------------------------ progress + persistence */
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollHeight - el.clientHeight;
        const p = max > 40 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0;
        setPct(p);
        if (p > (s.reads[post.id]?.pct ?? 0)) s.setRead(post.id, Math.round(p), 0);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const tick = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    onScroll();
    // resume
    const saved = s.reads[post.id]?.pct ?? 0;
    if (saved > 4 && saved < 96) {
      window.setTimeout(() => {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTo({ top: (saved / 100) * max, behavior: 'auto' });
      }, 240);
    }
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      clearInterval(tick);
      const finalPct = pctRef.current;
      if (finalPct > 0) useStore.getState().setRead(post.id, Math.round(finalPct), Math.max(1, Math.round(elapsedRef.current / 60)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const pctRef = React.useRef(0);
  const elapsedRef = React.useRef(0);
  pctRef.current = pct;
  elapsedRef.current = elapsed;

  /* --------------------------------------------------------- keyboard */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (typing) return;
      if (e.key === 'j') el.scrollBy({ top: 120, behavior: 'smooth' });
      if (e.key === 'k') el.scrollBy({ top: -120, behavior: 'smooth' });
      if (e.key === 'h') app.setHeat(post.id, 1, { title: post.title, author: post.authorHandle });
      if (e.key === 'b') {
        s.toggleSave(post.id);
        app.toast(s.saved[post.id] ? 'Removed from library' : 'Saved · available offline', s.saved[post.id] ? 'cool' : 'heat');
      }
      if (e.key === 's') app.setShare(post.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, onClose]);

  const jumpTo = (i: number) => {
    const el = blockEls.current.get(i);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('ht-block--target');
    window.setTimeout(() => el?.classList.remove('ht-block--target'), 1500);
  };

  const measure = s.prefs.measure;
  const remaining = Math.max(0, Math.round((post.minutes ?? 6) * (1 - pct / 100)));

  return (
    <div ref={scrollRef} className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[#08080a]" style={{ animation: 'ht-read-in .6s cubic-bezier(.2,1,.3,1)' }}>
      {/* ------------------------------- sticky chrome */}
      <div className="sticky top-0 z-30 -mb-px border-b border-white/[.06] bg-[#08080a]/82 backdrop-blur-2xl">
        <div className="mx-auto flex h-[54px] max-w-[1180px] items-center gap-2 px-3 sm:px-5">
          <button onClick={onClose} className="ht-btn ht-btn--ghost !px-2.5" aria-label="Close reader">
            ←
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="ht-label">
                {post.origin === 'wire' ? 'syndicated forge' : post.origin === 'user' ? 'your forge' : 'heatt original'}
              </span>
              <span className="text-ink-faint">·</span>
              <span className="ht-num text-[11.5px] text-ink-mute">{pct < 97 ? `${remaining} min left` : 'finished'}</span>
              {elapsed > 25 && (
                <span className="ht-num hidden text-[11.5px] text-ink-faint sm:inline">· {Math.floor(elapsed / 60)}m {elapsed % 60}s read</span>
              )}
            </div>
          </div>
          <button onClick={() => setPanel(panel === 'type' ? null : 'type')} className={cls('ht-btn ht-btn--ghost !px-2.5', panel === 'type' && '!text-ember-300')} aria-label="Reading controls">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 7V5h8v2M8 5v14m-3 0h6M14 12v-1.5h6v1.5M17 10.5V19m-2 0h4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => {
              s.toggleSave(post.id);
              app.toast(s.saved[post.id] ? 'Removed from library' : 'Saved · available offline', s.saved[post.id] ? 'cool' : 'heat');
            }}
            className={cls('ht-btn ht-btn--ghost !px-2.5', !!s.saved[post.id] && '!text-ember-300')}
            aria-label="Save to library"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill={s.saved[post.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7">
              <path d="M18.5 3.5H5.5A1.5 1.5 0 0 0 4 5v15.5l8-4.6 8 4.6V5a1.5 1.5 0 0 0-1.5-1.5Z" />
            </svg>
          </button>
          <button onClick={() => app.setShare(post.id)} className="ht-btn ht-btn--heat !px-3 !py-1.5 !text-[12.5px]">
            Share
          </button>
        </div>
        {/* heat progress bar */}
        <div className="relative h-[3px] w-full bg-white/[.05]">
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, rgba(43,224,200,.9), var(--ht-ember) 45%, ${pct > 92 ? 'var(--ht-whitehot)' : 'var(--ht-flame)'})`,
              boxShadow: `0 0 ${8 + pct * 0.3}px rgba(255,${Math.round(120 + pct)},${Math.round(60 - pct * 0.4)},${0.5 + pct / 220})`,
            }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>
      </div>

      <AnimatePresence>
        {panel === 'type' && <TypePanel onClose={() => setPanel(null)} />}
      </AnimatePresence>

      {/* ------------------------------- article */}
      <article
        className={cls('mx-auto px-5 pb-[26vh] pt-8 sm:pt-12', measure === 'narrow' ? 'max-w-[620px]' : measure === 'wide' ? 'max-w-[860px]' : 'max-w-[740px]')}
        style={{ fontFamily: s.prefs.serif ? undefined : 'Inter Variable, sans-serif' }}
      >
        <Cover post={post} burning={burning} />

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag} href={`/explore?tag=${encodeURIComponent(tag)}`} onClick={onClose} className="ht-chip !normal-case !tracking-normal">
                #{tag}
              </Link>
            ))}
            <span className="ht-chip" style={{ borderColor: 'rgba(255,138,31,.4)', color: t.color }}>
              {kelvin(heat.temp)} · {t.label}
            </span>
          </div>

          <h1
            className="ht-title mt-4 text-[clamp(2.1rem,1.2rem+3.6vw,3.6rem)] text-ink"
            style={{ textWrap: 'balance' as any, textShadow: burning ? '0 0 60px rgba(255,92,10,.5)' : undefined }}
          >
            {post.title}
          </h1>

          {post.dek && (
            <p className="mt-4 text-[clamp(1.05rem,1rem+.4vw,1.3rem)] leading-[1.55] text-ink-dim" style={{ textWrap: 'pretty' as any }}>
              {post.dek}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-white/[.07] py-3.5">
            <Link href={`/u/${post.authorHandle}`} onClick={onClose} className="flex items-center gap-2.5">
              <Avatar name={post.authorName} handle={post.authorHandle} src={post.authorAvatar} size={40} />
              <span>
                <span className="block text-[14px] font-bold leading-tight hover:underline">{post.authorName}</span>
                <span className="block text-[12px] text-ink-mute">
                  @{post.authorHandle}
                  {post.org ? ` · ${post.org}` : ''} · {prettyDate(post.date)}
                </span>
              </span>
            </Link>
            <span className="flex-1" />
            <span className="ht-num text-[12.5px] text-ink-mute">{post.minutes ?? 6} min read</span>
            <span className="hidden h-6 w-px bg-white/10 sm:block" />
            <span className="hidden sm:block">
              <Sparkline values={heat.trend} w={64} h={18} color={t.color} />
            </span>
            <div className="relative">
              <HeatButton
                level={level}
                count={app.countOf(post)}
                temp={heat.temp}
                size="lg"
                onChange={(lv, meta) => app.setHeat(post.id, lv, { ignited: meta.ignited, title: post.title, author: post.authorHandle })}
              />
              <FireOverlay active={burning} />
            </div>
          </div>

          {post.origin === 'wire' && <Attribution post={post} />}
        </header>

        <div ref={bodyRef} className="ht-prose relative mt-9">
          {blocks ? (
            blocks.map((b, i) => (
              <BlockWithHeat
                key={i}
                index={i}
                postId={post.id}
                block={b}
                heat={Math.max(wave[i] ?? 0, (paraHeats[i] ?? 0) / 3)}
                myLevel={paraHeats[i] ?? 0}
                onRef={(el) => {
                  if (el) blockEls.current.set(i, el);
                  else blockEls.current.delete(i);
                }}
                onClose={onClose}
              />
            ))
          ) : md ? (
            <Markdown
              doc={md}
              opts={{
                blockHeat: (i) => Math.max(wave[i] ?? 0, (paraHeats[i] ?? 0) / 3),
                onBlockRef: (i, el) => {
                  if (el) blockEls.current.set(i, el);
                  else blockEls.current.delete(i);
                },
                onInternalLink: () => app.toast('Internal link — kept in-app', 'cool'),
              }}
            />
          ) : syndicated.state === 'loading' ? (
            <LoadingBody />
          ) : (
            <OfflineBody
              post={post}
              meta={syndicated.meta}
              onRetry={() => {
                setSyndicated({ state: 'loading' });
                setAttempt((a) => a + 1);
              }}
            />
          )}

          {(level >= 2 || burning) && <EmberTrail active count={12} />}
        </div>

        <EndCard post={post} pct={pct} elapsed={elapsed} onClose={onClose} />
      </article>

      {/* ------------------------------- heat spine */}
      <HeatSpine values={wave} paraHeats={paraHeats} pct={pct} onJump={jumpTo} temp={heat.temp} burning={burning} />

      <style>{`
        @keyframes ht-read-in{from{opacity:0;transform:translateY(10px) scale(.995);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}
        @keyframes ht-cover-out{to{opacity:0;transform:translateY(-20px)}}
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------- cover */

function Cover({ post, burning }: { post: Post; burning: boolean }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 420], [0, -70]);
  const scale = useTransform(scrollY, [0, 420], [1.04, 1.16]);
  const [ok, setOk] = React.useState(true);
  const src = post.cover;
  return (
    <motion.div
      className="relative overflow-hidden rounded-[22px] border border-white/[.07]"
      style={{ y, background: 'linear-gradient(140deg,#14141a,#0a0a0d)', boxShadow: burning ? '0 40px 120px -30px rgba(255,92,10,.7)' : '0 40px 90px -50px rgba(0,0,0,1)' }}
    >
      {src && ok ? (
        <motion.img
          src={src}
          alt={post.title ?? ''}
          loading="eager"
          onError={() => setOk(false)}
          className="block aspect-[16/8] w-full object-cover"
          style={{ scale, filter: `saturate(${burning ? 1.35 : 1.06}) brightness(${burning ? 1.1 : 1})`, transition: 'filter .6s' }}
        />
      ) : (
        <div className="grid aspect-[16/8] w-full place-items-center" style={{ background: 'radial-gradient(80% 100% at 20% 110%, rgba(255,45,18,.4), transparent 62%), linear-gradient(140deg,#14141a,#0a0a0d)' }}>
          <span className="ht-title ht-heat-text text-[clamp(1.6rem,1rem+3vw,3rem)]">{post.authorName}</span>
        </div>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(8,8,10,.15) 20%,rgba(8,8,10,.86))' }} />
      <FireOverlay active={burning} />
    </motion.div>
  );
}

function Attribution({ post }: { post: Post }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[16px] border border-cryo-teal/20 bg-[rgba(43,224,200,.045)] p-3">
      <span className="ht-chip !border-cryo-teal/35 !text-cryo-teal">syndicated</span>
      <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-dim">
        Published freely by <b className="text-ink">{post.authorName}</b>
        {post.org ? ` of ${post.org}` : ''} on {prettyDate(post.date)}. heatt renders it in its own typography and never stores the text —{' '}
        <a href={post.canonical} target="_blank" rel="noopener noreferrer" className="text-cryo-teal underline-offset-2 hover:underline">
          read the original
        </a>
        .
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ block view */

function BlockWithHeat(props: {
  index: number;
  postId: string;
  block: ArticleBlock;
  heat: number;
  myLevel: number;
  onRef: (el: HTMLElement | null) => void;
  onClose: () => void;
}) {
  const { index, postId, block, heat, myLevel, onRef, onClose } = props;
  const app = useApp();
  const [hover, setHover] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const lvl = (myLevel as any) ?? 0;

  return (
    <div
      ref={(el) => {
        ref.current = el;
        onRef(el);
      }}
      className={cls('ht-block group/blk relative', heat > 0.62 ? 'ht-block--hot' : heat > 0.34 ? 'ht-block--warm' : '')}
      style={{ ['--bh' as string]: heat } as React.CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <BlockView block={block} onClose={onClose} />

      {/* per-paragraph heat affordance */}
      <div
        className="pointer-events-auto absolute -left-11 top-1 hidden lg:block"
        style={{ opacity: hover || lvl > 0 ? 1 : 0, transform: `translateX(${hover || lvl > 0 ? 0 : -6}px)`, transition: 'opacity .25s, transform .25s' }}
      >
        <button
          onClick={() => {
            const next = lvl >= 3 ? 0 : (Math.min(3, lvl + 1) as any);
            useStore.getState().setHeat(paraKey(postId, index), next);
            if (next === 3) {
              app.ignite(`${postId}:p${index}`);
              app.toast('Paragraph ignited — added to the crowd waveform', 'heat');
            }
          }}
          className="grid h-6 w-6 place-items-center rounded-full border text-[10px] font-black"
          style={{
            borderColor: lvl > 0 ? 'rgba(255,138,31,.5)' : 'var(--ht-line)',
            color: lvl > 0 ? 'var(--ht-flare)' : 'var(--ht-ink-faint)',
            background: lvl > 0 ? 'rgba(255,92,10,.14)' : 'rgba(255,255,255,.03)',
            boxShadow: lvl > 1 ? '0 0 16px -2px rgba(255,92,10,.9)' : undefined,
          }}
          title={lvl ? `Your heat: level ${lvl}/3 — click to raise` : 'Heat this paragraph'}
        >
          {lvl > 0 ? '▲' : '+'}
        </button>
      </div>

      {heat > 0.6 && (
        <span className="pointer-events-none absolute -left-[3.4rem] top-1 hidden text-[10px] font-bold text-ember-300/80 lg:block" style={{ opacity: hover ? 1 : 0.55 }}>
          {Math.round(heat * 100)}
        </span>
      )}
    </div>
  );
}

function BlockView({ block, onClose }: { block: ArticleBlock; onClose: () => void }) {
  switch (block.t) {
    case 'h':
      return <h2 id={block.id}>{block.text}</h2>;
    case 'p':
      return <p>{block.text}</p>;
    case 'quote':
      return (
        <blockquote>
          {block.text}
          {block.cite && <footer className="mt-2 text-[12px] not-italic text-ink-mute">— {block.cite}</footer>}
        </blockquote>
      );
    case 'ul':
      return (
        <ul>
          {block.items.map((i, n) => (
            <li key={n}>{<Inline tokens={i} />}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol>
          {block.items.map((i, n) => (
            <li key={n}>{<Inline tokens={i} />}</li>
          ))}
        </ol>
      );
    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} caption={block.caption} />;
    case 'img':
      return (
        <figure>
          <img src={block.src} alt={block.alt} loading="lazy" decoding="async" />
          {(block.caption || block.credit) && (
            <figcaption>
              {block.caption}
              {block.credit ? ` · ${block.credit}` : ''}
            </figcaption>
          )}
        </figure>
      );
    case 'hr':
      return <hr />;
    case 'callout': {
      const tone =
        block.kind === 'heat'
          ? { b: 'rgba(255,92,10,.34)', bg: 'linear-gradient(100deg,rgba(255,45,18,.14),rgba(255,181,49,.05))', c: 'var(--ht-flare)' }
          : block.kind === 'warn'
            ? { b: 'rgba(255,181,49,.28)', bg: 'linear-gradient(100deg,rgba(255,181,49,.1),transparent)', c: '#FFD27D' }
            : { b: 'rgba(43,224,200,.24)', bg: 'linear-gradient(100deg,rgba(43,224,200,.07),transparent)', c: 'var(--ht-cryo-teal)' };
      return (
        <aside className="my-[1.6em] rounded-[16px] border p-4" style={{ borderColor: tone.b, background: tone.bg }}>
          <div className="mb-1.5 flex items-center gap-2">
            <span style={{ color: tone.c }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 3.2c1 2.6.2 3.9-1 5.2-1.3 1.4-2.8 2.6-2.8 5.2A4.4 4.4 0 0 0 16.4 18c.1-2.2-1.3-3.6-1.8-5.6 2 1.9 3.2 4 3.2 6.4A5.8 5.8 0 1 1 5.4 11C5.4 6.9 9.6 4.4 12 3.2Z" />
              </svg>
            </span>
            <b className="text-[13px] uppercase tracking-[0.1em]" style={{ color: tone.c }}>
              {block.title}
            </b>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-dim">{block.text}</p>
        </aside>
      );
    }
    case 'links':
      return (
        <aside className="my-[1.8em] rounded-[16px] border border-white/[.08] bg-white/[.02] p-4">
          <div className="ht-label mb-2.5">Further reading</div>
          <ul className="space-y-2.5 !mt-0">
            {block.items.map((l) => (
              <li key={l.href} className="!mt-0">
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-2 text-[14px] no-underline">
                  <span className="text-ember-400">↗</span>
                  <span className="font-semibold text-ink transition-colors hover:text-ember-200">{l.label}</span>
                  {l.note && <span className="text-[12px] text-ink-mute">— {l.note}</span>}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      );
    default:
      return null;
  }
}

/** bold/inline-code parser for the seed block strings (no markdown import) */
function Inline({ tokens }: { tokens: string }) {
  const parts = tokens.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
        const [text, link] = p.split(/ \[|\]\(/);
        if (link) {
          const href = link.replace(/\)$/, '');
          const label = `${text}${p.includes('](') ? '' : ''}`.replace(/\[$/, '');
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer">
              {label.replace(/[\[].*$/, '')}
            </a>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

/* --------------------------------------------------------------- spine */

function HeatSpine({
  values,
  paraHeats,
  pct,
  onJump,
  temp,
  burning,
}: {
  values: number[];
  paraHeats: Record<number, number>;
  pct: number;
  onJump: (i: number) => void;
  temp: number;
  burning: boolean;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const n = Math.max(8, values.length);
  const cells = Array.from({ length: n }, (_, i) => {
    const v = values[Math.min(values.length - 1, Math.floor((i / n) * values.length))] ?? 0.1;
    const mine = paraHeats[i] ?? 0;
    return { i, v: Math.max(v, mine / 3), mine };
  });
  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block 2xl:right-10">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-full border border-white/[.07] bg-black/45 p-2 backdrop-blur-xl" style={{ boxShadow: burning ? '0 0 40px -6px rgba(255,92,10,.8)' : undefined }}>
        <span className="ht-num mb-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-ember-300">{Math.round(pct)}%</span>
        {cells.map((c) => (
          <button
            key={c.i}
            onMouseEnter={() => setHovered(c.i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onJump(c.i)}
            className="group relative block rounded-full transition-all"
            style={{
              width: 4 + c.v * 16,
              height: 3,
              background: c.mine >= 3 ? 'var(--ht-whitehot)' : c.v > 0.6 ? 'var(--ht-flame)' : c.v > 0.3 ? 'rgba(255,138,31,.55)' : 'rgba(255,255,255,.16)',
              boxShadow: c.v > 0.6 ? `0 0 ${4 + c.v * 12}px rgba(255,138,31,.85)` : undefined,
            }}
            aria-label={`Jump to paragraph ${c.i + 1}`}
          >
            {hovered === c.i && (
              <span className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-ember-500/40 bg-[#150c07] px-2.5 py-1 text-[10.5px] font-bold text-ember-200">
                {Math.round(c.v * 100)}° crowd {c.mine ? `· you ${['', 'ember', 'blaze', 'ignited'][c.mine]}` : ''}
              </span>
            )}
          </button>
        ))}
        <span className="ht-label mt-1 rotate-180 text-[8px] [writing-mode:vertical-rl]">heat spine</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- type controls */

function TypePanel({ onClose }: { onClose: () => void }) {
  const s = useStore();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="fixed right-3 top-[64px] z-40 w-[268px] rounded-[18px] border border-white/[.09] bg-[#0d0d11]/95 p-3 backdrop-blur-2xl"
      style={{ boxShadow: '0 30px 80px -30px rgba(0,0,0,1)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="ht-label">Reading environment</span>
        <button onClick={onClose} className="text-ink-mute hover:text-ink">
          ✕
        </button>
      </div>
      <Seg
        label="Density"
        value={s.prefs.density}
        options={[
          { v: 'dense', l: 'Dense' },
          { v: 'normal', l: 'Normal' },
          { v: 'cozy', l: 'Cozy' },
        ]}
        onChange={(v) => s.setPrefs({ density: v as any })}
      />
      <Seg
        label="Measure"
        value={s.prefs.measure}
        options={[
          { v: 'narrow', l: '68ch' },
          { v: 'normal', l: '74ch' },
          { v: 'wide', l: '84ch' },
        ]}
        onChange={(v) => s.setPrefs({ measure: v as any })}
      />
      <Seg
        label="Face"
        value={s.prefs.serif ? 'serif' : 'sans'}
        options={[
          { v: 'serif', l: 'Newsreader' },
          { v: 'sans', l: 'Inter' },
        ]}
        onChange={(v) => s.setPrefs({ serif: v === 'serif' })}
      />
      <Seg
        label="Ignition FX"
        value={s.prefs.ignitionFx}
        options={[
          { v: 'full', l: 'Full' },
          { v: 'subtle', l: 'Subtle' },
          { v: 'off', l: 'Off' },
        ]}
        onChange={(v) => s.setPrefs({ ignitionFx: v as any })}
      />
      <button
        onClick={() => s.setPrefs({ reduceMotion: !s.prefs.reduceMotion })}
        className={cls('mt-2 flex w-full items-center justify-between rounded-[12px] border px-3 py-2 text-[13px] font-semibold transition-colors', s.prefs.reduceMotion ? 'border-ember-500/45 bg-ember-500/10 text-ember-200' : 'border-white/[.07] text-ink-dim hover:border-white/20')}
      >
        Reduce motion
        <span className={cls('ht-num text-[11px]', s.prefs.reduceMotion ? 'text-ember-300' : 'text-ink-faint')}>{s.prefs.reduceMotion ? 'on' : 'off'}</span>
      </button>
    </motion.div>
  );
}

function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2.5">
      <span className="ht-label mb-1.5 block !text-[9px]">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cls('flex-1 rounded-[10px] border px-2 py-1.5 text-[12px] font-bold transition-all', value === o.v ? 'border-ember-500/50 bg-ember-500/12 text-ember-100' : 'border-white/[.07] text-ink-mute hover:border-white/20 hover:text-ink')}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ end states */

function LoadingBody() {
  return (
    <div className="space-y-4 pt-2">
      {[92, 100, 86, 96, 70].map((w, i) => (
        <div key={i} className="space-y-2">
          <motion.div className="h-3.5 rounded bg-white/[.055]" animate={{ opacity: [0.4, 0.85, 0.4] }} transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.13 }} style={{ width: `${w}%` }} />
          <motion.div className="h-3.5 rounded bg-white/[.035]" animate={{ opacity: [0.4, 0.85, 0.4] }} transition={{ duration: 1.7, repeat: Infinity, delay: 0.1 + i * 0.13 }} style={{ width: `${Math.max(40, w - 22)}%` }} />
        </div>
      ))}
      <p className="pt-3 text-[13px] text-ink-mute">
        Fetching the article body from the publisher’s public API and rendering it in heatt type… nothing is stored on our side.
      </p>
    </div>
  );
}

function OfflineBody({ post, meta, onRetry }: { post: Post; meta?: any; onRetry: () => void }) {
  return (
    <div className="rounded-[18px] border border-ember-500/25 bg-[linear-gradient(140deg,rgba(255,45,18,.09),transparent_60%)] p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="ht-chip !border-ember-500/40 !text-ember-200">body offline</span>
        <span className="text-[12px] text-ink-mute">the wire is unreachable from this network</span>
      </div>
      <h2 className="ht-title text-[22px]">{post.title}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-dim">{post.dek}</p>
      {meta?.excerpt && <p className="mt-3 border-l-2 border-ember-500/40 pl-3 text-[13.5px] italic leading-relaxed text-ink-mute">{meta.excerpt}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={onRetry} className="ht-btn ht-btn--heat !py-2 !text-[13px]">
          Retry fetch
        </button>
        <a href={post.canonical} target="_blank" rel="noopener noreferrer" className="ht-btn !py-2 !text-[13px]">
          Read original ↗
        </a>
        <span className="text-[12px] text-ink-faint">cached for 24h in your browser after a successful read</span>
      </div>
    </div>
  );
}

function EndCard({ post, pct, elapsed, onClose }: { post: Post; pct: number; elapsed: number; onClose: () => void }) {
  const app = useApp();
  const s = useStore();
  const author = post.author ?? getUser(post.authorHandle);
  const finished = pct >= 90;
  const related = React.useMemo(
    () => app.posts.filter((p) => p.id !== post.id && p.tags.some((tg) => post.tags.includes(tg))).slice(0, 3),
    [app.posts, post]
  );
  const replyCount = s.replies.filter((r) => r.postId === post.id).length;

  return (
    <div className="mt-14">
      <div className="ht-hairline" />

      {/* reading receipt */}
      <div className="ht-panel mt-6 grid gap-4 p-5 sm:grid-cols-[1.3fr_1fr]">
        <div>
          <span className="ht-label">reading receipt</span>
          <h3 className="ht-title mt-1.5 text-[22px]">{finished ? 'You finished it' : 'Paused at ' + Math.round(pct) + '%'}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-dim">
            {finished
              ? `${elapsed > 0 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : 'under a minute'} on ${post.minutes ?? 6} minutes of text. Resumed progress and heat are saved to your device only.`
              : 'Your position is stored locally — come back and the reader will drop you on the paragraph you left.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tg) => (
              <Link key={tg} href={`/explore?tag=${tg}`} onClick={onClose} className="ht-chip !normal-case !tracking-normal">
                #{tg}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-[16px] border border-white/[.07] bg-black/25 p-4">
          <div className="flex items-center justify-between">
            <span className="ht-label">your heat</span>
            <span className="ht-num text-[12px] text-ember-300">{kelvin(post.heat!.temp)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <HeatButton level={app.heatOf(post.id)} count={app.countOf(post)} temp={post.heat!.temp} onChange={(lv, meta) => app.setHeat(post.id, lv, { ignited: meta.ignited, title: post.title, author: post.authorHandle })} />
            <span className="text-[11.5px] leading-tight text-ink-mute">
              tap = ember
              <br />
              hold = blaze → inferno
            </span>
          </div>
          <button onClick={() => app.setShare(post.id)} className="ht-btn mt-3 w-full !py-2 !text-[12.5px]">
            Share as a story card
          </button>
        </div>
      </div>

      {/* author card */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[18px] border border-white/[.07] bg-white/[.017] p-4">
        <Avatar name={author.name} handle={author.handle} src={author.avatar} size={54} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">{author.name}</div>
          <div className="text-[12.5px] text-ink-mute">@{author.handle} · {compact(author.followers)} followers · mass {author.thermalMass.toFixed(2)}</div>
          <p className="mt-1 line-clamp-2 text-[13px] text-ink-dim">{author.bio}</p>
        </div>
        <button onClick={() => app.toggleFollow(author.handle)} className={cls('ht-btn', s.follows.includes(author.handle) ? '' : 'ht-btn--heat')}>
          {s.follows.includes(author.handle) ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* replies */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="ht-title text-[18px]">Replies {replyCount > 0 && <span className="text-ink-mute">({replyCount})</span>}</h3>
          <span className="text-[12px] text-ink-mute">discussion stays attached to the piece</span>
        </div>
        <div className="space-y-3">
          {s.replies.filter((r) => r.postId === post.id).map((r) => {
            const u = getUser(r.author);
            return (
              <div key={r.id} className="flex gap-3 rounded-[16px] border border-white/[.06] p-3">
                <Avatar name={u.name} handle={u.handle} src={u.avatar} size={30} />
                <div>
                  <div className="text-[12.5px] text-ink-mute">
                    <b className="text-ink">{u.name}</b> · {timeAgo(r.at)}
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-dim">{r.text}</p>
                </div>
              </div>
            );
          })}
          <ReplyBox postId={post.id} onClose={onClose} />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-8">
          <h3 className="ht-title mb-3 text-[18px]">Same heat, different angle</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <button key={r.id} onClick={() => app.openPost(r.id)} className="ht-card p-3.5 text-left">
                <span className="ht-label">{r.kind === 'forge' ? `${r.minutes} min` : 'spark'}</span>
                <span className="mt-1.5 line-clamp-3 block text-[13.5px] font-semibold leading-snug text-ink">{r.title ?? r.text}</span>
                <span className="mt-2 block text-[11.5px] text-ink-mute">@{r.authorHandle} · {kelvin(r.heat!.temp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReplyBox({ postId, onClose }: { postId: string; onClose: () => void }) {
  const app = useApp();
  const s = useStore();
  const [text, setText] = React.useState('');
  return (
    <div className="flex gap-3 rounded-[16px] border border-white/[.07] bg-black/25 p-3">
      <Avatar name={app.me?.name ?? 'Guest'} handle={app.me?.handle ?? 'guest'} src={app.me?.avatar} size={30} />
      <div className="flex-1">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply — threads live at the end of the piece, never inside it"
          className="ht-input resize-none !bg-transparent !px-0 !text-[14px] focus:!shadow-none"
        />
        <div className="flex justify-end">
          <button
            disabled={!text.trim()}
            onClick={() => {
              s.addReply({ postId, author: app.me?.handle ?? 'you', text: text.trim() });
              setText('');
              app.toast('Reply posted to the thread', 'heat');
              onClose();
            }}
            className="ht-btn ht-btn--heat !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

/* The reader is a route (/read/[id]) rather than a floating overlay, so the
   URL is shareable and the browser back gesture cools you out of an article
   the way it should. `openPost()` pushes here. */
