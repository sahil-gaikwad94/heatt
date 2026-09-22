'use client';
/* ============================================================================
   / — the landing page.

   Structured as an argument, not a brochure: cold start → heat instead of
   likes → the reader → the graph → the maths → the ship. Two live, interactive
   props (you can heat the demo card, and drag the cooling slider to watch the
   board change) because the product is the demo.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import dynamic from 'next/dynamic';
import { HeatField } from '@/components/gl/HeatField';
import { HeatButton } from '@/components/heat/HeatButton';
import { FireOverlay, EmberTrail } from '@/components/heat/FireOverlay';
import { Avatar, Sparkline } from '@/components/ui/primitives';
import { WaveBars } from '@/components/cards/PostCard';
import { computeHeat, tempLabel, kelvin } from '@/lib/heat';
import { avatarDataUri, cls, compact } from '@/lib/util';
import { ORIGINALS } from '@/lib/seed/articles';
import { useStore } from '@/lib/store';

const Logo = () => (
  <span className="flex items-center gap-2">
    <span className="grid h-[26px] w-[26px] place-items-center">
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="1" x2="0.7" y2="0">
            <stop offset="0" stopColor="#FF2D12" />
            <stop offset="0.55" stopColor="#FF8A1F" />
            <stop offset="1" stopColor="#FFF6DE" />
          </linearGradient>
        </defs>
        <path d="M14.1 1.6c1.6 4.3.3 6.4-1.5 8.4-2 2.3-4.5 4.3-4.5 8.5A6.1 6.1 0 0 0 15.3 24a6 6 0 0 0 4.9-6.9c-1.9-1.6-3.5-4-3.5-6.6 2.2 2.4 3.3 5.2 3.3 8A9 9 0 1 1 4.6 12C4.6 6.5 9.6 3.9 14.1 1.6Z" fill="url(#lg)" transform="translate(-1.5 -1)" />
      </svg>
    </span>
    <span className="ht-title ht-heat-text text-[22px] leading-none">heatt</span>
  </span>
);

export default function Landing() {
  const [intro, setIntro] = React.useState(false);
  const onboarded = useStore((s) => s.onboarded);
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0]);
  const [seen, setSeen] = React.useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setSeen(Math.round(v * 100)));

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-[#07070a]">
      {/* scroll-linked ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeatField intensity={0.3} flow={0.7} vignette={0.62} interactive scale={0.6} cool={0} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(6,6,8,.72), rgba(6,6,8,.9) 70%)' }} />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#07070a]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[62px] max-w-[1180px] items-center gap-4 px-5">
          <Logo />
          <nav className="ml-6 hidden items-center gap-6 text-[13.5px] font-semibold text-ink-dim md:flex">
            <a href="#heat" className="transition-colors hover:text-ink">Heat</a>
            <a href="#reader" className="transition-colors hover:text-ink">Reader</a>
            <a href="#board" className="transition-colors hover:text-ink">The board</a>
            <a href="#stack" className="transition-colors hover:text-ink">Zero-cost stack</a>
          </nav>
          <span className="flex-1" />
          <span className="hidden items-center gap-2 rounded-full border border-white/[.08] px-3 py-1.5 text-[11.5px] text-ink-mute sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cryo-teal shadow-[0_0_8px_#2BE0C8]" />
            wire live · no sign-up wall
          </span>
          <Link href={onboarded ? '/feed' : '/feed'} className="ht-btn ht-btn--heat !py-2">
            {onboarded ? 'Open heatt' : 'Enter the forge'}
          </Link>
        </div>
        <div className="h-[2px] w-full bg-white/[.04]">
          <div className="h-full" style={{ width: `${seen}%`, background: 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare),var(--ht-whitehot))', boxShadow: '0 0 14px rgba(255,92,10,.8)', transition: 'width .1s linear' }} />
        </div>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section className="relative z-10">
        <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="mx-auto max-w-[1180px] px-5 pb-16 pt-14 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.06fr_.94fr]">
            <div>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-5 flex flex-wrap items-center gap-2">
                <span className="ht-chip !border-ember-500/40 !bg-ember-500/10 !text-ember-200">public beta</span>
                <span className="ht-chip !normal-case !tracking-normal">micro × long-form, one feed</span>
              </motion.div>

              <h1 className="ht-title text-[clamp(2.9rem,1.4rem+7.2vw,7.2rem)] leading-[0.88]" style={{ textWrap: 'balance' as any }}>
                {['Ideas are', 'measured in', 'heat.'].map((l, i) => (
                  <motion.span
                    key={l}
                    initial={{ opacity: 0, y: 26, filter: 'blur(14px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.12 + i * 0.12, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                    className={cls('block', i === 2 && 'ht-heat-text')}
                  >
                    {l}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.9 }}
                className="mt-6 max-w-[52ch] text-[clamp(1rem,.94rem+.4vw,1.22rem)] leading-[1.62] text-ink-dim"
              >
                heatt deletes the wall between a 280-character observation and a 2,000-word technical deep-dive.
                Same feed, same physics, and everything reads <em className="text-ink not-italic underline decoration-ember-500/50 decoration-2 underline-offset-4">inside the app</em> — no redirects, no missing images, no paywall to finish a thought.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-8 flex flex-wrap items-center gap-2.5">
                <Link href="/feed" className="ht-btn ht-btn--heat !px-5 !py-3 !text-[15px]">
                  Open the board →
                </Link>
                <button onClick={() => setIntro(true)} className="ht-btn !px-4 !py-3 !text-[14px]">
                  ▶ Replay the 8-second intro
                </button>
                <button
                  onClick={() => {
                    useStore.setState({ introSeen: false, onboarded: false });
                    location.href = '/feed';
                  }}
                  className="ht-btn ht-btn--ghost !py-3 !text-[13.5px]"
                >
                  See onboarding
                </button>
              </motion.div>

              <div className="mt-9 grid max-w-[540px] grid-cols-3 gap-4 border-t border-white/[.07] pt-5">
                {[
                  { k: '2 modalities', v: 'spark + forge' },
                  { k: '0 redirect', v: 'in-app reading' },
                  { k: '$0 / month', v: 'cold-start infra' },
                ].map((x) => (
                  <div key={x.k}>
                    <div className="ht-title text-[17px] text-ink">{x.k}</div>
                    <div className="mt-0.5 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <HeroCard />
          </div>
        </motion.div>
      </section>

      {/* --------------------------------------------------- heat interaction */}
      <section id="heat" className="relative z-10 border-y border-white/[.06] bg-[#08080a]/60 py-20 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[.95fr_1.05fr]">
          <DemoHeatCard />
          <div>
            <SectionKicker>the interaction</SectionKicker>
            <h2 className="ht-title mt-3 text-[clamp(1.9rem,1.2rem+2.8vw,3.4rem)]">
              A like is free. That is the problem.
            </h2>
            <p className="mt-4 max-w-[54ch] text-[15.5px] leading-[1.72] text-ink-dim">
              On heatt, approval costs attention. Tap for an ember. <b className="text-ink">Hold</b> and the ring fills — blaze at 1.15s, and at 2.45s
              the post <b className="text-ember-300">catches fire</b> for two and a half seconds: shockwave, embers along the card, a warm bloom, the
              whole surface wobbling, then a visible cool-down.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { t: 'Level 1 — Ember', d: '“I saw this.” Weight ×1. Cheap, honest, frictionless.' },
                { t: 'Level 2 — Blaze', d: '“This is good.” You had to stop scrolling. Weight ×2.6.' },
                { t: 'Level 3 — Inferno', d: '“This changed my mind.” Weight ×6.5 and the ranker feels it.' },
              ].map((row, i) => (
                <motion.li
                  key={row.t}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3.5 rounded-[16px] border border-white/[.07] bg-white/[.017] p-3.5"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ember-500/40 bg-ember-500/10 text-[12px] font-black text-ember-300">{i + 1}</span>
                  <span>
                    <b className="block text-[14.5px]">{row.t}</b>
                    <span className="block text-[13.5px] leading-relaxed text-ink-mute">{row.d}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
            <p className="mt-5 text-[13px] text-ink-faint">
              Fire that loops is a screensaver. Fire that ends is an event — that is why it stops.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- reader */}
      <section id="reader" className="relative z-10 py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <SectionKicker>the reader</SectionKicker>
          <div className="mt-3 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="ht-title text-[clamp(1.9rem,1.2rem+2.8vw,3.4rem)]">Full articles. Nothing borrowed from someone else’s CSS.</h2>
              <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.72] text-ink-dim">
                Free long-form is syndicated from the public Forem API and re-rendered through our own remark pipeline — headings, images, code,
                tables, footnotes and links all intact, in fluid type that holds 65–75 characters per line on any viewport.
              </p>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {[
                  ['Heat-warmed progress', 'Cool teal at the top, white-hot at 100%. A promise you can see being kept.'],
                  ['Heat spine', 'A per-paragraph waveform of where readers stopped and held. Tap a spike to jump.'],
                  ['Resume', 'Close at 63%, come back, land on the paragraph you left.'],
                  ['Attribution, not theft', 'Syndicated pieces carry an author card and a visible link to the original. Bodies are never stored server-side.'],
                ].map(([t, d], i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="rounded-[16px] border border-white/[.07] bg-white/[.017] p-3.5"
                  >
                    <b className="block text-[14px] text-ink">{t}</b>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">{d}</p>
                  </motion.div>
                ))}
              </div>
              <Link href={`/read/${ORIGINALS[0].id}`} className="ht-btn ht-btn--heat mt-6 !py-2.5">
                Open a real forge →
              </Link>
            </div>
            <ReaderMock />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ board maths */}
      <section id="board" className="relative z-10 border-y border-white/[.06] bg-[#08080a]/60 py-20 backdrop-blur-xl">
        <div className="mx-auto max-w-[1180px] px-5">
          <SectionKicker>heat diffusion</SectionKicker>
          <h2 className="ht-title mt-3 max-w-[20ch] text-[clamp(1.9rem,1.2rem+2.8vw,3.4rem)]">Ranking, modelled as a cooling body.</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <CoolingLab />
            <div className="space-y-4">
              <div className="ht-panel p-4">
                <span className="ht-label">the equation</span>
                <p className="mt-2 font-mono text-[13.5px] leading-relaxed text-ember-100">T(t) = Σ w·mᵢ·e^(−(t−tᵢ)/τ) + κ∇²T</p>
                <p className="mt-2 font-mono text-[13.5px] leading-relaxed text-ink-mute">rank = log(1+T) · (1+velocity)^0.55</p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-ink-dim">
                  <li><b className="text-ink">τ = 9h</b> — Newton cooling; nothing is ranked on volume alone.</li>
                  <li><b className="text-ink">mᵢ</b> — the reader’s thermal mass, not the author’s follower count.</li>
                  <li><b className="text-ink">κ</b> — heat diffuses through the graph between neighbours.</li>
                </ul>
              </div>
              <div className="ht-panel p-4">
                <span className="ht-label">semantic cliff</span>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-dim">
                  We find the steepest local drop in the sorted logits and cut the board there. Items past the cliff are demoted, not padded —
                  so a quiet day gives you nine excellent things instead of forty mediocre ones.
                </p>
                <div className="mt-3 flex items-end gap-1.5">
                  {[46, 42, 39, 37, 33, 31, 28, 9, 7, 5, 4, 3].map((v, i) => (
                    <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: v * 1.6, background: i > 6 ? 'rgba(255,255,255,.09)' : 'linear-gradient(180deg,var(--ht-flare),rgba(255,92,10,.3))' }} />
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] text-ink-faint">↑ the board has a shape. That shape is information.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ graph */}
      <section className="relative z-10 py-20">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionKicker>retention without shame</SectionKicker>
            <h2 className="ht-title mt-3 text-[clamp(1.9rem,1.2rem+2.8vw,3.2rem)]">A heatmap people stare at, not one that shames them.</h2>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.72] text-ink-dim">
              Collapsed, it is a square of five weeks. Expanded, it is a 53-week dashboard where every cell answers “what happened that day”:
              reads, heats, ignitions, publishes, minutes. Empty days stay neutral — no red gaps, no streak shaming.
            </p>
            <HeatmapMock />
          </div>
          <div className="space-y-4">
            <ShareMock />
            <div className="ht-panel p-4">
              <span className="ht-label">everything else in the box</span>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {[
                  ['⌘K palette', 'jump anywhere'],
                  ['Story posters', 'canvas-exported 1080×1920'],
                  ['Link previews', 'edge <head>-only parser'],
                  ['Heat polls', 'bars on the heat ramp'],
                  ['Profiles', 'handle, pfp, cover, bio'],
                  ['Promote', 'spark → forge in one tap'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-[12px] border border-white/[.06] px-3 py-2">
                    <b className="block text-[13px]">{t}</b>
                    <span className="text-[11.5px] text-ink-faint">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the stack */}
      <section id="stack" className="relative z-10 border-t border-white/[.06] py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <SectionKicker>zero-dollar architecture</SectionKicker>
          <h2 className="ht-title mt-3 max-w-[24ch] text-[clamp(1.8rem,1.2rem+2.4vw,3rem)]">Built so the free tier is a plan, not a placeholder.</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { t: 'ISR + SWR', d: 'Feed and article pages regenerate on a timer; the CDN serves stale while revalidating. One origin hit per ten minutes, however many readers.', k: 's-maxage=600, stale-while-revalidate=86400' },
              { t: 'Edge link previews', d: 'A streaming HTML parser reads the target’s <head> and aborts the socket the moment it closes. No body download, no commercial API bill.', k: 'abort after </head>' },
              { t: 'Relational + JSONB split', d: 'Feeds stay relational so timestamp sorts never touch TOAST; heterogeneous long-form blocks live in JSONB where single-record reads are the pattern.', k: 'B-Tree on (created_at)' },
            ].map((x, i) => (
              <motion.div
                key={x.t}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.7 }}
                className="ht-panel flex flex-col p-4"
              >
                <b className="ht-title text-[17px]">{x.t}</b>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-dim">{x.d}</p>
                <code className="mt-3 block rounded-[10px] border border-white/[.07] bg-black/40 px-2.5 py-1.5 font-mono text-[11.5px] text-ember-200">{x.k}</code>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- final CTA */}
      <section className="relative z-10 overflow-hidden py-24">
        <div className="mx-auto max-w-[900px] px-5 text-center">
          <h2 className="ht-title text-[clamp(2.2rem,1.2rem+5vw,4.6rem)] leading-[0.94]">
            Bring something <span className="ht-heat-text">worth heating.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[56ch] text-[15.5px] leading-[1.7] text-ink-dim">
            No algorithm you have to decode, no link that throws you out of the app, no growth team. One clock, one ramp, and a board that ends when the
            heat does.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/feed" className="ht-btn ht-btn--heat !px-6 !py-3 !text-[15px]">
              Open heatt
            </Link>
            <button onClick={() => setIntro(true)} className="ht-btn !px-5 !py-3 !text-[14px]">
              Watch the intro again
            </button>
          </div>
          <p className="mt-6 text-[12px] text-ink-faint">Runs entirely in the browser. Your heat stays on your device.</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[.06] py-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-4 px-5 text-[12px] text-ink-faint">
          <Logo />
          <span className="hidden sm:block">·</span>
          <span>Sparks & forges · heat-diffusion ranked</span>
          <span className="flex-1" />
          <span>© {new Date().getFullYear()} heatt</span>
          <Link href="/settings" className="hover:text-ink-dim">Settings</Link>
          <Link href="/explore" className="hover:text-ink-dim">Explore</Link>
        </div>
      </footer>

      <AnimatePresence>
        {intro && <IntroOverlay onClose={() => setIntro(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- hero card */

function HeroCard() {
  const art = ORIGINALS[0];
  const [heat, setHeat] = React.useState(0);
  const [burn, setBurn] = React.useState(false);
  const heat_ = React.useMemo(
    () => computeHeat({ reactions: art.reactions, comments: art.comments, date: art.date, mine: { level: heat as any, at: heat ? Date.now() : undefined }, thermalMass: 1.6, seed: art.id }),
    [art.id, heat]
  );
  const t = tempLabel(heat_.temp);

  return (
    <motion.div initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 blur-3xl" style={{ background: `radial-gradient(60% 60% at 50% 50%, ${burn ? 'rgba(255,92,10,.45)' : 'rgba(255,92,10,.18)'}, transparent 70%)`, transition: 'background .8s' }} />
      <div className={cls('ht-card relative', burn && 'ht-card--ignited', heat >= 2 && 'ht-card--heated')}>
        <span className="ht-heat-aura" aria-hidden />
        <FireOverlay active={burn} />
        {heat >= 2 && <EmberTrail active count={heat === 3 || burn ? 14 : 7} />}
        <div className="p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name="Kirill Vasiliev" handle="k-vasiliev" size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold">Kirill Vasiliev</div>
              <div className="text-[11.5px] text-ink-mute">@k-vasiliev · 4d · <span style={{ color: t.color }}>{t.label}</span></div>
            </div>
            <span className="ht-chip !border-ember-500/35 !text-ember-200">forge · {art.minutes} min</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-[14px] border border-white/[.06]">
            <img src={art.cover} alt="" className="aspect-[16/7] w-full object-cover" />
          </div>
          <h2 className="ht-title mt-3 text-[21px] leading-tight">{art.title}</h2>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-dim">{art.dek}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="ht-label shrink-0 !text-[9px]">crowd</span>
            <WaveBars values={Array.from({ length: 18 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 0.8 + heat)) * (0.3 + heat * 0.2))} burning={burn} />
          </div>
          <div className="mt-3.5 flex items-center gap-2 border-t border-white/[.06] pt-3">
            <HeatButton level={heat as any} count={(art.reactions ?? 0) + heat * 3} temp={heat_.temp} onChange={(lv) => { setHeat(lv); if (lv === 3) { setBurn(true); setTimeout(() => setBurn(false), 2400); } }} />
            <span className="ht-num text-[12px] text-ink-mute">{compact(art.comments ?? 0)} replies</span>
            <span className="flex-1" />
            <span className="ht-num text-[13px] font-black" style={{ color: t.color }}>{kelvin(heat_.temp)}</span>
            <Sparkline values={heat_.trend} w={54} h={16} color={t.color} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-ink-faint">↑ this is live. Hold the flame button — the ranking number moves with you.</p>
    </motion.div>
  );
}

/* ------------------------------------------------------ interactive demos */

function DemoHeatCard() {
  const [level, setLevel] = React.useState(0);
  const [burn, setBurn] = React.useState(false);
  const [count, setCount] = React.useState(1284);
  return (
    <motion.div className="ht-card relative p-4" animate={{ boxShadow: burn ? '0 40px 120px -30px rgba(255,92,10,.85)' : '0 30px 80px -40px rgba(0,0,0,1)' }}>
      <span className="ht-heat-aura" aria-hidden />
      <FireOverlay active={burn} />
      <div className="flex items-center gap-2.5">
        <img src={avatarDataUri('Amara Singh', 'amara')} alt="" className="h-9 w-9 rounded-full" />
        <div>
          <div className="text-[13.5px] font-bold">Amara Singh</div>
          <div className="text-[11.5px] text-ink-mute">@amara · 9h</div>
        </div>
        <span className="ht-chip ml-auto !border-cryo-teal/30 !text-cryo-teal">spark</span>
      </div>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink">
        The reading progress bar is not a progress indicator. It is a promise you can see being kept or broken. That is the entire reason read-through
        moved 12 points.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <HeatButton
          level={level as any}
          count={count}
          temp={18 + level * 12}
          onChange={(lv) => {
            setLevel(lv);
            setCount((c) => c + (lv > level ? (lv === 3 ? 3 : 1) : -1));
            if (lv === 3) {
              setBurn(true);
              window.setTimeout(() => setBurn(false), 2400);
            }
          }}
        />
        <span className="ht-chip !normal-case !tracking-normal">↩ 41</span>
        <span className="flex-1" />
        <AnimatePresence>
          {level === 3 && (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-full border border-ember-400/50 bg-ember-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-ember-100">
              ignited · +6.5 thermal
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CoolingLab() {
  const [tau, setTau] = React.useState(9);
  const [hold, setHold] = React.useState(2.45);
  const [heats, setHeats] = React.useState(6);
  const series = React.useMemo(() => {
    const out: number[] = [];
    for (let h = 0; h <= 48; h++) {
      const inj = Math.exp(-Math.max(0, h - 2) / 6) * heats * [0, 1, 2.6, 6.5][Math.max(1, Math.min(3, Math.round(hold)))];
      out.push(Math.round((Math.exp(-h / tau) * 40 + inj) * 10) / 10);
    }
    return out;
  }, [tau, hold, heats]);
  const max = Math.max(...series, 1);

  return (
    <div className="ht-panel p-4">
      <div className="flex items-center justify-between">
        <span className="ht-label">cooling lab · 48 hours</span>
        <span className="ht-num text-[11.5px]" style={{ color: tempLabel(series[0]).color }}>{series[0].toFixed(1)}° → {series[series.length - 1].toFixed(1)}°</span>
      </div>
      <svg viewBox="0 0 300 110" className="mt-3 h-[132px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF8A1F" stopOpacity=".45" />
            <stop offset="1" stopColor="#FF2D12" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1="0" x2="300" y1={(g * 110) / 3} y2={(g * 110) / 3} stroke="rgba(255,255,255,.06)" strokeWidth="0.6" />
        ))}
        <path
          d={`M0 ${110 - (series[0] / max) * 100} ${series.map((v, i) => `L${(i / (series.length - 1)) * 300} ${110 - (v / max) * 100}`).join(' ')} L300 110 L0 110 Z`}
          fill="url(#area)"
        />
        <path
          d={`M0 ${110 - (series[0] / max) * 100} ${series.map((v, i) => `L${(i / (series.length - 1)) * 300} ${110 - (v / max) * 100}`).join(' ')}`}
          fill="none"
          stroke="#FFB531"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <line x1="0" x2="300" y1={110 - (12 / max) * 100} y2={110 - (12 / max) * 100} stroke="#2BE0C8" strokeWidth="0.8" strokeDasharray="4 4" opacity=".7" />
        <text x="4" y={110 - (12 / max) * 100 - 4} fill="#2BE0C8" fontSize="6" fontFamily="Inter, sans-serif">
          cliff — below this, off the board
        </text>
      </svg>
      <div className="mt-3 space-y-3">
        <Lab label="τ cooling constant" value={`${tau}h`}>
          <input type="range" min={2} max={30} value={tau} onChange={(e) => setTau(Number(e.target.value))} className="ht-range" style={{ ['--v' as string]: `${((tau - 2) / 28) * 100}%` }} />
        </Lab>
        <Lab label="hold length" value={`${hold.toFixed(2)}s → level ${hold > 2.4 ? 3 : hold > 1.15 ? 2 : 1}`}>
          <input type="range" min={0} max={300} value={hold * 100} onChange={(e) => setHold(Number(e.target.value) / 100)} className="ht-range" style={{ ['--v' as string]: `${(hold / 3) * 100}%` }} />
        </Lab>
        <Lab label="heats in first hour" value={String(heats)}>
          <input type="range" min={0} max={40} value={heats} onChange={(e) => setHeats(Number(e.target.value))} className="ht-range" style={{ ['--v' as string]: `${(heats / 40) * 100}%` }} />
        </Lab>
      </div>
    </div>
  );
}

function Lab({ label, value, children }: { label: string; value: string | number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[130px] shrink-0 text-[12.5px] font-semibold text-ink-dim">{label}</span>
      <span className="flex-1">{children}</span>
      <span className="ht-num w-[112px] shrink-0 text-right text-[11.5px] text-ember-300">{value}</span>
    </div>
  );
}

function ReaderMock() {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8 }} className="relative">
      <div className="ht-panel overflow-hidden">
        <div className="relative">
          <img src="/art/deep-read.jpg" alt="" className="aspect-[16/9] w-full object-cover" />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(8,8,10,.25),rgba(8,8,10,.95))' }} />
          <div className="absolute inset-x-5 bottom-4">
            <span className="ht-chip !border-ember-500/40 !text-ember-200">forge · 9 min</span>
            <h3 className="ht-title mt-2 text-[24px] leading-tight">Deep reading inside a shallow feed</h3>
          </div>
        </div>
        <div className="relative p-5">
          <div className="space-y-2.5">
            {[96, 100, 88, 94, 60].map((w, i) => (
              <div key={i} className={cls('h-2.5 rounded-full bg-white/[.07]', i === 2 && 'bg-ember-500/25')} style={{ width: `${w}%` }} />
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-faint">↑ body text is real — this is the same prose pipeline the app uses.</p>
          <div className="mt-3 rounded-[14px] border border-white/[.07] bg-black/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="ht-label !text-[9px]">progress</span>
              <span className="ht-num text-[11px] text-ember-300">63% · 3 min left</span>
            </div>
            <span className="relative block h-[5px] overflow-hidden rounded-full bg-white/[.07]">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: '8%' }}
                whileInView={{ width: '63%' }}
                viewport={{ once: false, margin: '-40px' }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: 'linear-gradient(90deg,var(--ht-cryo-teal),var(--ht-ember) 55%,var(--ht-flare))', boxShadow: '0 0 14px rgba(255,138,31,.8)' }}
              />
            </span>
          </div>
          <div className="absolute -right-1 top-8 hidden h-[190px] w-[46px] items-center justify-center rounded-l-2xl border border-white/[.07] bg-black/50 backdrop-blur-md sm:flex">
            <div className="flex flex-col items-center gap-[3px]">
              {[0.2, 0.35, 0.9, 0.4, 0.3, 0.55, 0.28, 0.42, 0.86, 0.33, 0.5, 0.72].map((v, i) => (
                <span key={i} className="rounded-full" style={{ width: 4 + v * 16, height: 3, background: v > 0.6 ? 'var(--ht-flare)' : 'rgba(255,255,255,.18)', boxShadow: v > 0.6 ? '0 0 10px rgba(255,138,31,.8)' : undefined }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HeatmapMock() {
  const cells = Array.from({ length: 7 * 16 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.31) * Math.cos(i * 0.11));
    return v;
  });
  return (
    <div className="ht-panel mt-6 p-4">
      <div className="flex flex-wrap gap-[3px]">
        {cells.map((v, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(0.6, i * 0.004), duration: 0.35 }}
            className="h-[11px] w-[11px] rounded-[3px]"
            style={{
              background: v < 0.12 ? 'rgba(255,255,255,.055)' : v < 0.35 ? '#5d2109' : v < 0.6 ? '#a83a06' : v < 0.82 ? '#ff5c0a' : '#fff6de',
              boxShadow: v > 0.82 ? '0 0 12px rgba(255,138,31,.9)' : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-mute">
        <span>Less</span>
        {[0.06, 0.25, 0.45, 0.68, 0.9].map((v) => (
          <span key={v} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: v < 0.12 ? 'rgba(255,255,255,.055)' : v < 0.35 ? '#5d2109' : v < 0.6 ? '#a83a06' : v < 0.82 ? '#ff5c0a' : '#fff6de' }} />
        ))}
        <span>Incandescent</span>
        <span className="flex-1" />
        <span className="ht-num text-ember-300">214-day best</span>
      </div>
    </div>
  );
}

function ShareMock() {
  return (
    <div className="ht-panel flex items-center gap-4 p-4">
      <div className="relative shrink-0 overflow-hidden rounded-[14px] border border-white/[.08]" style={{ width: 96, height: 170 }}>
        <img src="/art/story-canvas.jpg" alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(8,8,10,.15),rgba(8,8,10,.9))' }} />
        <div className="absolute inset-x-2 bottom-2">
          <span className="block text-[8px] font-black uppercase tracking-[0.16em] text-ember-200">heatt</span>
          <span className="mt-0.5 block text-[9px] font-bold leading-tight text-white">Heat Diffusion: ranking a feed</span>
        </div>
      </div>
      <div className="min-w-0">
        <span className="ht-label">share studio</span>
        <h3 className="ht-title mt-1 text-[19px]">Cards that get reposted, not screenshotted</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-dim">
          Story (1080×1920), square, and link formats exported from canvas at full resolution. The palette, ember density and background are generated from
          the post’s temperature, so the poster ages with the piece.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {['download PNG', 'copy image', 'native share sheet', 'copy link'].map((x) => (
            <span key={x} className="ht-chip !normal-case !tracking-normal">{x}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="ht-chip !border-ember-500/30 !bg-ember-500/[.07] !text-ember-200"
    >
      {children}
    </motion.span>
  );
}

/** replays the same WebGL sequence the first-visit boot layer uses */
function IntroOverlay({ onClose }: { onClose: () => void }) {
  const C = React.useMemo(() => dynamic(() => import('@/components/intro/CinematicIntro').then((m) => m.CinematicIntro), { ssr: false }), []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <C onDone={onClose} done={false} />
    </motion.div>
  );
}
