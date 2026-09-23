'use client';
/* ============================================================================
   / — the landing page.

   Restraint over spectacle: a calm obsidian room, one signature amber accent,
   and the product shown rather than shouted. The argument is still sparks ×
   forges in one feed, ranked by heat — but the article is shown *full* (cover,
   standfirst, real body), because "read everything here" is the whole claim.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Atmosphere } from '@/components/gl/Atmosphere';
import { HeatButton } from '@/components/heat/HeatButton';
import { Avatar } from '@/components/ui/primitives';
import { computeHeat, tempLabel, LEVEL_META } from '@/lib/heat';
import { cls, avatarDataUri, compact } from '@/lib/util';
import { ORIGINALS } from '@/lib/seed/articles';
import { getUser } from '@/lib/seed/users';
import { useStore } from '@/lib/store';
import type { HeatLevel } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;

/* The real heatt original the landing page shows off. */
const SAMPLE = ORIGINALS.find((a) => a.id === 'orig-dark-material') ?? ORIGINALS[0];

function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="lg" x1="0" y1="1" x2="0.7" y2="0">
              <stop offset="0" stopColor="#2EF2A6" />
              <stop offset="0.55" stopColor="#00E5A0" />
              <stop offset="1" stopColor="#F2FFFA" />
            </linearGradient>
          </defs>
          <path d="M14.1 1.6c1.6 4.3.3 6.4-1.5 8.4-2 2.3-4.5 4.3-4.5 8.5A6.1 6.1 0 0 0 15.3 24a6 6 0 0 0 4.9-6.9c-1.9-1.6-3.5-4-3.5-6.6 2.2 2.4 3.3 5.2 3.3 8A9 9 0 1 1 4.6 12C4.6 6.5 9.6 3.9 14.1 1.6Z" fill="url(#lg)" transform="translate(-1.5 -1)" />
        </svg>
      </span>
      <span className="ht-title ht-heat-text text-[21px] leading-none">heatt</span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-ember-300">
      <span className="h-1 w-1 rounded-full bg-ember-400 shadow-[0_0_8px_#00C98C]" />
      {children}
    </span>
  );
}

export default function Landing() {
  const onReplayIntro = () => {
    useStore.setState({ introSeen: false, onboarded: false });
    window.location.href = '/feed';
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip">
      <Atmosphere variant="public" />

      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#050505]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center gap-6 px-5">
          <Logo />
          <nav className="ml-4 hidden items-center gap-7 text-[13.5px] font-medium text-ink-dim md:flex">
            <a href="#modalities" className="transition-colors hover:text-ink">Sparks × forges</a>
            <a href="#heat" className="transition-colors hover:text-ink">Heating</a>
            <a href="#reader" className="transition-colors hover:text-ink">The reader</a>
            <a href="#stories" className="transition-colors hover:text-ink">Stories</a>
            <a href="#profile" className="transition-colors hover:text-ink">Profile</a>
          </nav>
          <span className="flex-1" />
          <span className="hidden items-center gap-2 rounded-full border border-white/[.08] px-3 py-1.5 text-[11.5px] text-ink-mute sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cryo-teal shadow-[0_0_8px_#3DDCFF]" />
            no sign-up · reads in place
          </span>
          <Link href="/feed" className="ht-btn ht-btn--heat !py-2">
            Open heatt
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-16 pt-16 sm:pt-24 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mb-6 flex flex-wrap items-center gap-2"
            >
              <span className="ht-chip !border-ember-500/30 !bg-ember-500/[.08] !text-ember-200">open beta</span>
              <span className="ht-chip !normal-case !tracking-normal">micro × long-form, one feed</span>
            </motion.div>

            <h1 className="ht-title text-[clamp(2.9rem,1.4rem+6.4vw,6.4rem)] leading-[0.9]" style={{ textWrap: 'balance' as never }}>
              {['Ideas are', 'measured in', 'heat.'].map((l, i) => (
                <motion.span
                  key={l}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.1, duration: 0.75, ease: EASE }}
                  className={cls('block', i === 2 && 'ht-heat-text')}
                >
                  {l}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.8 }}
              className="mt-6 max-w-[54ch] text-[clamp(1rem,.94rem+.4vw,1.2rem)] leading-[1.65] text-ink-dim"
            >
              heatt removes the wall between a 280-character observation and a 2,000-word deep-dive.
              One board, one rank — and every piece reads <em className="not-italic text-ink underline decoration-ember-500/50 decoration-2 underline-offset-4">inside the app</em>,
              full length, in its own typography.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-8 flex flex-wrap items-center gap-2.5"
            >
              <Link href="/feed" className="ht-btn ht-btn--heat !px-5 !py-3 !text-[15px]">
                Open the board →
              </Link>
              <button onClick={onReplayIntro} className="ht-btn ht-btn--ghost !px-4 !py-3 !text-[13.5px]">
                Replay the intro
              </button>
            </motion.div>

            <div className="mt-10 grid max-w-[520px] grid-cols-3 gap-5 border-t border-white/[.07] pt-6">
              {[
                { k: 'Write short or long', v: 'sparks · forges' },
                { k: 'Read it here', v: 'no redirects' },
                { k: 'Share it as a story', v: 'frames · poster · link' },
              ].map((x) => (
                <div key={x.k}>
                  <div className="ht-title text-[15px] text-ink">{x.k}</div>
                  <div className="mt-1 text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroForge />
        </div>
      </section>

      {/* ------------------------------------------------------ modalities */}
      <section id="modalities" className="relative z-10 border-y border-white/[.06] py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <SectionLabel>one feed, two modalities</SectionLabel>
          <h2 className="ht-title mt-4 max-w-[22ch] text-[clamp(1.9rem,1.2rem+2.6vw,3.2rem)]">
            A spark and an essay deserve the same room.
          </h2>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-[1.72] text-ink-dim">
            Most platforms force a choice: velocity or depth. heatt renders both on the same board,
            ranked together — so a two-line observation and a long argument can sit side by side
            without either being demoted for its shape.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                tag: 'spark',
                accent: 'var(--ht-cryo-teal)',
                title: 'Short-form, but honest',
                body: 'Up to a few hundred characters, with links, polls, quotes and images. Ranked by the same clock as everything else, so a fast thought can out-heat a slow essay when it earns it.',
                points: ['link previews', 'polls', 'quote sparks', 'reposts'],
              },
              {
                tag: 'forge',
                accent: 'var(--ht-ember)',
                title: 'Long-form, but reachable',
                body: 'Full articles with cover art, standfirst, headings, code, tables and footnotes — read start to finish inside heatt. Free long-form is syndicated and attributed, never a redirect to finish the thought.',
                points: ['full-length reader', 'resume anywhere', 'cover art', 'attribution'],
              },
            ].map((c, i) => (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
                className="ht-panel p-6"
              >
                <span className="ht-chip" style={{ borderColor: c.accent, color: c.accent }}>{c.tag}</span>
                <h3 className="ht-title mt-3 text-[22px] text-ink">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-dim">{c.body}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.points.map((p) => (
                    <span key={p} className="ht-chip !normal-case !tracking-normal">{p}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- heat interaction */}
      <section id="heat" className="relative z-10 py-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 lg:grid-cols-[.94fr_1.06fr]">
          <HeatDemo />
          <div>
            <SectionLabel>the interaction</SectionLabel>
            <h2 className="ht-title mt-4 text-[clamp(1.9rem,1.2rem+2.6vw,3.3rem)]">
              A like is free. That is the problem.
            </h2>
            <p className="mt-4 max-w-[54ch] text-[15.5px] leading-[1.72] text-ink-dim">
              On heatt, approval costs attention. Tap once for an ember. Hold, and the ring fills —
              blaze at 1.15s, and at 2.45s the post catches fire for two seconds, then visibly cools.
              Fire that loops is a screensaver; fire that ends is an event.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                { t: 'Ember', d: '“I saw this.” One tap. Frictionless, and it still counts.' },
                { t: 'Blaze', d: '“This is good.” You held it for a beat — that pause is the whole point.' },
                { t: 'Inferno', d: '“This changed my mind.” Hold all the way and the card catches fire, then cools.' },
              ].map((row, i) => (
                <motion.li
                  key={row.t}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
                  className="flex gap-3.5 rounded-[16px] border border-white/[.07] bg-white/[.015] p-4"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ember-500/35 bg-ember-500/[.08] text-[12px] font-black text-ember-300">{i + 1}</span>
                  <span>
                    <b className="block text-[14.5px] text-ink">{row.t}</b>
                    <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-mute">{row.d}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ reader */}
      <section id="reader" className="relative z-10 border-y border-white/[.06] py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <SectionLabel>the reader</SectionLabel>
          <div className="mt-4 grid gap-12 lg:grid-cols-[1fr_.92fr]">
            <div>
              <h2 className="ht-title max-w-[20ch] text-[clamp(1.9rem,1.2rem+2.6vw,3.3rem)]">
                Full articles. Nothing borrowed from someone else’s CSS.
              </h2>
              <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.72] text-ink-dim">
                Free long-form is syndicated from the public Forem API and re-rendered through heatt’s
                own remark pipeline — headings, images, code, tables and links intact, in fluid type
                that holds 65–75 characters per line on any viewport.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  ['A bar, not a wall', 'A thin progress bar floats over the app while you read, then follows you to the next piece.'],
                  ['Resume, properly', 'Close at 63% and the board offers to finish it — the same paragraph, the same scroll.'],
                  ['Your typography', 'Density, measure and serif ↔ sans are yours, and they apply to every piece at once.'],
                  ['Attribution, not theft', 'Syndicated pieces carry the author and a link to the original.'],
                ].map(([t, d], i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: i * 0.07, duration: 0.55 }}
                    className="rounded-[16px] border border-white/[.07] bg-white/[.015] p-4"
                  >
                    <b className="block text-[14px] text-ink">{t}</b>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">{d}</p>
                  </motion.div>
                ))}
              </div>
              <Link href={`/read/${SAMPLE.id}`} className="ht-btn ht-btn--heat mt-7 !py-2.5">
                Open a real forge →
              </Link>
            </div>
            <ReaderPreview />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- stories */}
      <section id="stories" className="relative z-10 border-y border-white/[.06] py-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <SectionLabel>stories</SectionLabel>
            <h2 className="ht-title mt-4 max-w-[20ch] text-[clamp(1.9rem,1.2rem+2.6vw,3.3rem)]">
              A piece worth passing on deserves better than a screenshot.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.72] text-ink-dim">
              Any spark or forge becomes a set of frames you step through like a story: the cover,
              the line that mattered, who wrote it, where to read it. Story ratio for social, square
              for a grid, wide for a link card — composed on canvas at full resolution in your
              browser, from the thing you are actually looking at.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                { t: 'Frames you step through', d: 'Tap the edges like a story, hold to pause. One idea per frame instead of one cramped image.' },
                { t: 'Real typography', d: 'Your cover, your title set in the display face — not a screen grab with a logo bolted on.' },
                { t: 'Out in one tap', d: 'Save the PNG, copy the image straight to the clipboard, or hand it to the native share sheet with the link.' },
              ].map((row, i) => (
                <motion.li
                  key={row.t}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
                  className="flex gap-3.5 rounded-[16px] border border-white/[.07] bg-white/[.015] p-4"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ember-500/35 bg-ember-500/[.08] text-[12px] font-black text-ember-300">{i + 1}</span>
                  <span>
                    <b className="block text-[14.5px] text-ink">{row.t}</b>
                    <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-mute">{row.d}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, ease: EASE }}
            className="relative mx-auto w-full max-w-[400px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10 blur-3xl"
              style={{ background: 'radial-gradient(50% 50% at 50% 40%, rgba(0,229,160,.12), transparent 70%)' }}
            />
            <div
              className="relative overflow-hidden rounded-[32px] border border-white/[.09] bg-black"
              style={{ aspectRatio: '9 / 15.4', boxShadow: '0 70px 130px -60px rgba(0,0,0,1)' }}
            >
              <img src={SAMPLE.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.62]" />
              <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.75) 0%,rgba(0,0,0,.12) 34%,rgba(0,0,0,.92) 92%)' }} />

              <div className="absolute inset-x-5 flex gap-1" style={{ top: 'max(16px, env(safe-area-inset-top))' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                    <span className="block h-full rounded-full bg-white" style={{ width: i === 0 ? '100%' : i === 1 ? '48%' : '0%' }} />
                  </span>
                ))}
              </div>

              <div className="absolute inset-x-6 bottom-7">
                <span className="ht-label">frame 2 of 3</span>
                <p className="ht-title mt-3 text-[clamp(1.5rem,1.2rem+1.4vw,2rem)] leading-[1.16] text-white">
                  {SAMPLE.dek}
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/[.16] pt-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-black text-[#04140E]" style={{ background: 'var(--ht-ember)' }}>
                    {getUser(SAMPLE.author).name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-white">{getUser(SAMPLE.author).name}</span>
                    <span className="block truncate text-[11px] text-white/60">@{SAMPLE.author} · {SAMPLE.minutes} min read</span>
                  </span>
                  <Link href={`/read/${SAMPLE.id}`} className="shrink-0 rounded-full border border-white/25 px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
                    Read
                  </Link>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-ink-faint">Frames generated from a real original.</p>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------- profile */}
      <section id="profile" className="relative z-10 py-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 lg:grid-cols-[1fr_.86fr]">
          <div>
            <SectionLabel>your page</SectionLabel>
            <h2 className="ht-title mt-4 max-w-[24ch] text-[clamp(1.9rem,1.2rem+2.6vw,3.3rem)]">
              A profile that reads like a portfolio, not a scoreboard.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.72] text-ink-dim">
              A portrait, one line about you, the two counts anyone actually checks, the things you
              write about, and then your work as a grid of covers. Nothing ranks you against anyone
              else, and nothing scores your worth as a number next to your name.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                ['Followers, not points', 'The only public numbers are who follows you and who you follow.'],
                ['Trait pills', 'Your boards, stated plainly, so the right reader finds you.'],
                ['A grid of covers', 'Long-form and sparks in one board — tap a cover, read it in place.'],
                ['Editable in place', 'Name, portrait, bio, traits — changed from the page itself, saved locally.'],
              ].map(([t, d], i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.07, duration: 0.55 }}
                  className="rounded-[16px] border border-white/[.07] bg-white/[.015] p-4"
                >
                  <b className="block text-[14px] text-ink">{t}</b>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">{d}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, ease: EASE }}
            className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[32px] border border-white/[.09] bg-[#050505]"
            style={{ boxShadow: '0 70px 130px -60px rgba(0,0,0,1)' }}
          >
            <div className="relative h-[136px]">
              <img src={SAMPLE.cover} alt="" className="h-full w-full object-cover opacity-60" />
              <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.45),#050505)' }} />
            </div>
            <div className="relative -mt-14 px-6 pb-7 text-center">
              <div className="relative mx-auto grid h-[92px] w-[92px] place-items-center">
                <img
                  src={avatarDataUri('Nyra Okonkwo', 'nyra')}
                  alt=""
                  className="h-[86px] w-[86px] rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 3px #050505, 0 0 0 4px rgba(255,255,255,.16)' }}
                />
                <span className="absolute -left-3 top-0 grid h-8 w-8 place-items-center rounded-full text-[14px]" style={{ background: 'linear-gradient(180deg,#202020,#0a0a0a)', border: '1px solid rgba(255,255,255,.14)' }}>✍️</span>
                <span className="absolute -right-3 bottom-0 grid h-8 w-8 place-items-center rounded-full text-[14px]" style={{ background: 'linear-gradient(180deg,#202020,#0a0a0a)', border: '1px solid rgba(255,255,255,.14)' }}>📖</span>
              </div>
              <p className="ht-title mt-4 text-[21px] text-white">Nyra Okonkwo</p>
              <p className="mt-1.5 text-[12.5px] text-ink-mute">
                <b className="text-white">18.4k</b> Followers · <b className="text-white">312</b> Following
              </p>
              <p className="mx-auto mt-2 max-w-[32ch] text-[12.5px] leading-relaxed text-ink-dim">
                Designs interfaces that behave like materials. Ex-Vercel.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {['design', 'motion', 'dark-ui'].map((t) => (
                  <span key={t} className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-ember-200" style={{ background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.26)' }}>
                    #{t}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {ORIGINALS.slice(1, 4).map((a) => (
                  <span key={a.id} className="relative block aspect-[4/5] overflow-hidden rounded-[12px] border border-white/[.07]">
                    <img src={a.cover} alt="" className="h-full w-full object-cover" />
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- final CTA */}
      <section className="relative z-10 overflow-hidden border-t border-white/[.06] py-24">
        <div className="mx-auto max-w-[860px] px-5 text-center">
          <h2 className="ht-title text-[clamp(2.2rem,1.2rem+4.6vw,4.4rem)] leading-[0.95]">
            Bring something <span className="ht-heat-text">worth heating.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-[15.5px] leading-[1.7] text-ink-dim">
            Write at whatever length the idea needs. Read it without leaving. Share it as something
            worth looking at. No growth team, no decoder ring, no link that throws you out of the app.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/feed" className="ht-btn ht-btn--heat !px-6 !py-3 !text-[15px]">
              Open heatt
            </Link>
            <button onClick={onReplayIntro} className="ht-btn !px-5 !py-3 !text-[14px]">
              Watch the intro
            </button>
          </div>
          <p className="mt-6 text-[12px] text-ink-faint">Runs entirely in the browser. Your heat stays on your device.</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[.06] py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-5 text-[12px] text-ink-faint">
          <Logo size={20} />
          <span className="hidden sm:block">·</span>
          <span>sparks &amp; forges · read in place</span>
          <span className="flex-1" />
          <span>© {new Date().getFullYear()} heatt</span>
          <Link href="/explore" className="hover:text-ink-dim">Explore</Link>
          <Link href="/settings" className="hover:text-ink-dim">Settings</Link>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------- hero forge */

function HeroForge() {
  const art = SAMPLE;
  const author = getUser(art.author);
  const excerpt = React.useMemo(() => {
    const paras = (art.blocks ?? []).filter((b) => b.t === 'p').map((b) => ('text' in b ? b.text : ''));
    const text = paras.join(' ').replace(/\s+/g, ' ').trim();
    return text.slice(0, 300);
  }, [art]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.8, ease: EASE }}
      className="relative"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 blur-3xl"
        style={{ background: 'radial-gradient(50% 50% at 60% 40%, rgba(0,229,160,.1), transparent 70%)' }}
      />
      <article className="ht-card overflow-hidden">
        {/* author row — who wrote it, and one tap to follow, exactly like the board */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <Avatar name={author.name} handle={author.handle} src={author.avatar} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold leading-tight text-ink">{author.name}</span>
            <span className="block truncate text-[11.5px] text-ink-mute">@{author.handle} · {art.minutes} min read</span>
          </span>
          <Link
            href="/feed"
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-[#04140E] transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--ht-ember)' }}
          >
            Follow
          </Link>
        </div>

        <div className="px-3">
          <img src={art.cover} alt="" className="block aspect-[16/9] w-full rounded-[18px] object-cover" />
        </div>

        {/* the article itself — the same charcoal sheet the reader gives it */}
        <div className="p-3">
          <Link href={`/read/${art.id}`} className="block">
            <div className="rounded-[18px] border border-white/[.07] bg-black/35 p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                {art.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ember-200"
                    style={{ background: 'rgba(0,229,160,.09)', border: '1px solid rgba(0,229,160,.24)' }}
                  >
                    #{t}
                  </span>
                ))}
                <span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-mute">
                  {compact(art.reactions ?? 0)} reactions · {compact(art.comments ?? 0)} replies
                </span>
              </div>
              <h2 className="ht-title mt-3 text-[clamp(1.35rem,1.15rem+.8vw,1.8rem)] leading-[1.14] text-white">{art.title}</h2>
              {art.dek && <p className="mt-2.5 text-[14.5px] leading-[1.64] text-ink-dim">{art.dek}</p>}
              {excerpt && (
                <div
                  className="relative mt-3 max-h-[104px] overflow-hidden"
                  style={{ maskImage: 'linear-gradient(180deg,#000 48%,transparent)', WebkitMaskImage: 'linear-gradient(180deg,#000 48%,transparent)' }}
                >
                  <p className="ht-prose text-[14.5px] leading-[1.72]">{excerpt}</p>
                </div>
              )}
              <div className="mt-5 flex items-center gap-3 border-t border-white/[.07] pt-4">
                <span className="ht-num text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">{art.minutes} min read</span>
                <span className="flex-1" />
                <span className="rounded-full px-4 py-2 text-[12.5px] font-bold text-[#04140E]" style={{ background: 'var(--ht-ember)' }}>
                  Read full article →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </article>
      <p className="mt-4 text-center text-[12px] text-ink-faint">
        This is a real article in the app — {art.minutes} minutes, read in place, no redirect.
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------- heat demo */

function HeatDemo() {
  const art = ORIGINALS[1] ?? ORIGINALS[0];
  const [level, setLevel] = React.useState<HeatLevel>(0);
  const author = getUser(art.author);
  const heat = React.useMemo(
    () =>
      computeHeat({
        reactions: art.reactions,
        comments: art.comments,
        date: art.date,
        mine: { level, at: level ? Date.now() : undefined },
        thermalMass: 1.6,
        seed: art.id,
      }),
    [art, level]
  );
  const t = tempLabel(heat.temp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className={cls('ht-card relative p-5', level >= 1 && 'ht-card--heated', level >= 3 && 'ht-card--ignited')}>
        <div className="flex items-start gap-3">
          <Avatar name={author.name} handle={author.handle} src={author.avatar} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14.5px] font-bold text-ink">{author.name}</span>
              <span className="text-[12.5px] text-ink-mute">@{author.handle}</span>
            </div>
            <p className="mt-2 text-[15px] leading-[1.62] text-ink">
              The best interfaces do not animate to be noticed. They animate to tell you what
              changed — and then they stop. Motion is punctuation, not paragraphs.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-white/[.06] bg-black/25 px-3 py-2">
          <span className="ht-label !text-[9px]">your heat</span>
          <span className="ht-num text-[13px] font-bold" style={{ color: t.color }}>
            {LEVEL_META[level].name}
          </span>
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-white/[.05] pt-3.5">
          <HeatButton
            level={level}
            count={(art.reactions ?? 0) + (level > 0 ? level : 0)}
            temp={heat.temp}
            size="lg"
            onChange={(lv) => setLevel(lv)}
          />
          <span className="text-[12.5px] leading-tight text-ink-mute">
            tap = ember
            <br />
            hold = blaze → inferno
          </span>
          <span className="flex-1" />
          <span className="ht-num text-[11px] text-ink-faint">{level}/3</span>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-faint">Try it — hold the flame for a second and a half.</p>
    </motion.div>
  );
}

/* --------------------------------------------------------- reader preview */

function ReaderPreview() {
  const art = SAMPLE;
  const paras = art.blocks?.filter((b) => b.t === 'p').slice(0, 3) ?? [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
      className="ht-panel overflow-hidden p-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="ht-label">{art.minutes} min read</span>
        <span className="flex-1" />
        <span className="ht-chip !normal-case !tracking-normal">{art.tags[0]}</span>
      </div>
      <h3 className="ht-title text-[clamp(1.2rem,1.05rem+.6vw,1.6rem)] leading-[1.16] text-ink">{art.title}</h3>
      <p className="mt-3 border-l-2 border-ember-500/40 pl-3 text-[14px] italic leading-[1.6] text-ink-dim">{art.dek}</p>
      <div className="ht-prose mt-4 max-h-[220px] overflow-hidden text-[14.5px]" style={{ maskImage: 'linear-gradient(180deg,#000 62%,transparent)', WebkitMaskImage: 'linear-gradient(180deg,#000 62%,transparent)' }}>
        {paras.map((b, i) => (
          <p key={i}>{'text' in b ? b.text : ''}</p>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">…and the rest reads right here, in the app.</p>
    </motion.div>
  );
}
