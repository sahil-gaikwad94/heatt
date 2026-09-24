'use client';
/* ============================================================================
   app/page.tsx — the landing page.

   A dark, cinematic argument for the product, told in four movements:

     01  hero      one light in a black room, the promise in eight words
     02  claim     what the room refuses to do
     03  chapters  three things the app does that others do not
     04  system    the actual tokens, on the page, as the evidence

   Every section reveals once, on scroll, and never animates again. Entering
   the app replays the intro for a first-time visitor and skips it for anyone
   who has been here before.
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Atmosphere } from '@/components/gl/Atmosphere';
import { LogoMark } from '@/components/shell/Shell';
import { Reveal, WordReveal } from '@/components/ui/motion';
import { EASE_OUT } from '@/lib/motion';

const CHAPTERS = [
  {
    no: '01',
    title: 'The reading holds you',
    body: 'Long pieces open in the room and stay there: real measure, real type sizes, a two-pixel rail for your place, and no redirect waiting at the end of the first paragraph.',
    art: '/art/deep-read.jpg',
  },
  {
    no: '02',
    title: 'Heat means one thing',
    body: 'Tap to warm something. Hold to mean it. Hold longer and it ignites and moves on the board. No counters about you, no streaks, no rank — one gesture, on the piece.',
    art: '/art/quiet-kiln.jpg',
  },
  {
    no: '03',
    title: 'A share you would send',
    body: 'Turn the line that stayed with you into a poster at real export size — three frames, five themes — or send the whole piece as a link that reads beautifully anywhere.',
    art: '/art/story-canvas.jpg',
  },
];

const TOKENS = [
  { name: 'void', value: '#000000', css: '#000000' },
  { name: 'base', value: '#06070A', css: '#06070A' },
  { name: 'surface', value: '#0B0D12', css: '#0B0D12' },
  { name: 'elev', value: '#11141A', css: '#11141A' },
  { name: 'lift', value: '#181C23', css: '#181C23' },
  { name: 'top', value: '#1F242C', css: '#1F242C' },
  { name: 'ink', value: '#F2F5FA', css: '#F2F5FA' },
  { name: 'ink-2', value: '#A3ACBD', css: '#A3ACBD' },
  { name: 'ink-3', value: '#6B7486', css: '#6B7486' },
  { name: 'champagne', value: '#E8D3A4', css: '#E8D3A4' },
  { name: 'glacier', value: '#6BA2FF', css: '#6BA2FF' },
  { name: 'line', value: 'rgba(255,255,255,.065)', css: '#3A3F49' },
];

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const rail = useSpring(scrollYProgress, { stiffness: 200, damping: 40, mass: 0.4 });
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -110]);
  const heroFade = useTransform(scrollYProgress, [0, 0.22], [1, 0.1]);

  const enter = (replay = false) => {
    if (replay) useStore.setState({ introSeen: false, onboarded: false });
    window.location.href = '/feed';
  };

  const fresh = useStore((s) => !s.introSeen || !s.onboarded);

  return (
    <main className="ht-landing ht-grain">
      {/* scroll progress: the same 2px rail the reader uses */}
      <div className="ht-progress-rail" aria-hidden>
        <motion.span className="ht-progress-rail__fill block" style={{ scaleX: rail, opacity: 0.85 }} />
      </div>

      {/* --------------------------------------------------------------- nav */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[68px] max-w-[1080px] items-center gap-4 px-6">
          <Link href="/" className="ht-wordmark" aria-label="heatt">
            <LogoMark size={26} />
            <span>heatt</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-[13px] text-ink-2 md:flex">
            <a href="#claim" className="transition-colors hover:text-ink">
              What it refuses
            </a>
            <a href="#chapters" className="transition-colors hover:text-ink">
              Three things it does
            </a>
            <a href="#system" className="transition-colors hover:text-ink">
              The system
            </a>
          </nav>
          <span className="flex-1" />
          <button onClick={() => enter(false)} className="ht-btn ht-btn--heat !h-9 !px-4 !text-[13px]">
            {fresh ? 'Enter the room' : 'Back to the board'}
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="ht-hero">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Atmosphere variant="public" />
        </div>
        <motion.div className="ht-hero__veil" aria-hidden style={{ opacity: heroFade }} />

        <div className="ht-hero__inner">
          <motion.div style={{ y: heroY }}>
            <Reveal>
              <span className="ht-hero__eyebrow">
                <span className="ht-hero__dot" aria-hidden />
                a room for things that stay with you
              </span>
            </Reveal>

            <h1 className="ht-display mt-7 text-ink">
              <WordReveal text="Don’t just scroll." delay={0.15} each={0.07} />
              <br />
              <em className="ht-champ-text">
                <WordReveal text="follow the thread." delay={0.5} each={0.07} />
              </em>
            </h1>

            <Reveal delay={0.75}>
              <p className="ht-hero__dek">
                heatt is a reading-first room: short notes that can grow into full stories, a reader that never
                redirects you, and a share worth sending. Black surfaces, one gesture, no scoreboard.
              </p>
            </Reveal>

            <Reveal delay={0.9}>
              <div className="ht-hero__actions">
                <button onClick={() => enter(false)} className="ht-btn ht-btn--heat !h-[50px] !px-7 !text-[15px]">
                  {fresh ? 'Step inside' : 'Open the board'}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </button>
                <a href="#chapters" className="ht-btn ht-btn--quiet !h-[50px] !px-6 !text-[15px]">
                  See how it feels
                </a>
                {!fresh && (
                  <button onClick={() => enter(true)} className="ht-btn ht-btn--ghost !h-[50px] !px-4 !text-[13.5px]">
                    Replay the intro
                  </button>
                )}
              </div>
            </Reveal>

            <Reveal delay={1.05}>
              <div className="ht-hero__meta">
                <div>
                  <b>0</b>
                  <span>leaderboards, ranks or streaks</span>
                </div>
                <div>
                  <b>6</b>
                  <span>house essays, written for the room</span>
                </div>
                <div>
                  <b>1</b>
                  <span>gesture: heat, and what it means</span>
                </div>
              </div>
            </Reveal>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------- claim */}
      <section id="claim" className="ht-section">
        <div className="ht-section__inner">
          <Reveal>
            <span className="ht-eyebrow">01 — what it refuses</span>
            <h2 className="ht-display text-ink">
              The internet has enough
              <br />
              things to <em>count</em>. This is a place to read.
            </h2>
            <p className="ht-section__body">
              We shipped every engagement mechanic a modern product is supposed to have, and then spent a month
              deleting them: reputation multipliers, temperature gauges in kelvin, seven-day trend lines, reading
              receipts, an annual review poster, a 365-day activity grid.
            </p>
            <p className="ht-section__body">
              What is left is a black room, one number that describes a piece of writing and never a person, and a
              reader that gets out of the way. Not a minimalist aesthetic — an argument about what attention is for.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'No leaderboards', b: 'Nothing ranks people. Heat is shown on the piece, never on the writer.' },
              { t: 'No invented people', b: 'The house, real syndicated writers, and you. No apologetic placeholder wall.' },
              { t: 'No reading receipts', b: 'Progress belongs to the story. One floating pill hands your place back.' },
              { t: 'No redirects', b: 'Stories open in the room, credited to their real author, with the original one tap away.' },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 0.06}>
                <div className="ht-card ht-card--pad h-full">
                  <span className="ht-label !text-[9px]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="ht-title mt-3 text-[16px] text-ink">{x.t}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">{x.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- chapters */}
      <section id="chapters" className="ht-section">
        <div className="ht-section__inner">
          <Reveal>
            <span className="ht-eyebrow">02 — three things it does</span>
            <h2 className="ht-display text-ink">
              Read it. Heat it.
              <br />
              <em>Send it.</em>
            </h2>
          </Reveal>

          <div className="ht-chapters">
            {CHAPTERS.map((c, i) => (
              <Reveal key={c.no} delay={i * 0.08}>
                <article className="ht-chapter h-full">
                  <span className="ht-chapter__art" aria-hidden style={{ background: `url(${c.art}) center/cover` }} />
                  <span className="ht-chapter__no">chapter {c.no}</span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="ht-mediacard" style={{ minHeight: 380 }}>
                <img src="/art/nocturne-ui.jpg" alt="" loading="lazy" />
                <span className="ht-mediacard__veil" aria-hidden />
                <div className="ht-mediacard__copy">
                  <span className="ht-eyebrow">the interface</span>
                  <p className="ht-title mt-3 max-w-[30ch] text-[clamp(1.2rem,1rem+1vw,1.7rem)] text-white">
                    A dark UI is a light model, not a black background with white text.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="ht-chip ht-chip--heat">champagne = heat</span>
                    <span className="ht-chip ht-chip--iris">glacier = live</span>
                    <span className="ht-chip">five greys, one lit edge</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="ht-display text-[clamp(1.5rem,1.2rem+1.6vw,2.2rem)] text-ink">
                  Fewer movements, each one bigger, none repeated.
                </h3>
                <p className="ht-section__body">
                  Two easing curves and one spring. Anything that loops is ambient and longer than seven seconds, so
                  nothing ever pulses at reading speed. The heat control charges to ignition and throws a single
                  shower of sparks — once, and then it is still.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="ht-chip">600ms entrances</span>
                  <span className="ht-chip">220ms exits</span>
                  <span className="ht-chip">2.2s ignition</span>
                  <span className="ht-chip">reduce-motion honoured everywhere</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ system */}
      <section id="system" className="ht-section">
        <div className="ht-section__inner">
          <Reveal>
            <span className="ht-eyebrow">03 — the system, in the open</span>
            <h2 className="ht-display text-ink">
              The palette is the
              <br />
              whole design argument.
            </h2>
            <p className="ht-section__body">
              Five cool near-blacks a few percent apart, four ink steps, and exactly two colours: champagne for
              heat, glacier for anything live. No green, no orange, no third hue smuggled in through an icon.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TOKENS.map((t) => (
                <div key={t.name}>
                  <div className="ht-swatch" style={{ background: t.css, minHeight: 78 }}>
                    <span>{t.value}</span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-ink-3">--{t.name}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { t: 'Bricolage Grotesque', b: 'Display — headlines, wordmark, chapter numbers.', s: '600' },
                { t: 'Inter Variable', b: 'Interface — everything you tap and every line of metadata.', s: '400–650' },
                { t: 'Newsreader Variable', b: 'Reading — long-form body, 68ch measure, 1.72 line-height.', s: '400' },
                { t: 'JetBrains Mono', b: 'Data — heat numbers, counters, code, timestamps.', s: '400–700' },
              ].map((x) => (
                <div key={x.t} className="ht-card ht-card--pad">
                  <p className="ht-title text-[15px] text-ink">{x.t}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-mute">{x.b}</p>
                  <p className="ht-num mt-3 text-[11px] text-ink-4">{x.s}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-14 ht-card flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="ht-eyebrow">the room is open</span>
                <p className="ht-display mt-3 text-[clamp(1.4rem,1.2rem+1.4vw,2.1rem)] text-ink">
                  {fresh ? 'Start with the intro. It is four seconds.' : 'The board is where you left it.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => enter(fresh)} className="ht-btn ht-btn--heat !h-[50px] !px-7 !text-[15px]">
                  {fresh ? 'Enter the room' : 'Open the board'}
                </button>
                <Link href="/explore" className="ht-btn ht-btn--quiet !h-[50px] !px-6 !text-[15px]">
                  Look around first
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-line px-6 py-10">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={24} />
            <span className="text-[13px] text-ink-3">heatt — a room, not a feed</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[12.5px] text-ink-4">
            <Link href="/feed" className="hover:text-ink-2">
              Board
            </Link>
            <Link href="/explore" className="hover:text-ink-2">
              Explore
            </Link>
            <Link href="/library" className="hover:text-ink-2">
              Library
            </Link>
            <Link href="/settings" className="hover:text-ink-2">
              Settings
            </Link>
            <span>written by the house, by real writers, and by you</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

