import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, Compass, Flame, Moon, PenLine, ShieldCheck, Sparkles } from 'lucide-react'
import { blogCatalog, blogCategories, type BlogCategory } from '../data/blogCatalog'
import { artFor } from '../data/categoryArt'
import { themeCatalog } from '../data/themes'
import { buddyById } from '../data/buddies'
import { BuddyShowcase, BuddySprite } from './Buddy'
import { HeatDemo } from './Heat'
import { SourceMark } from './ui/SourceMark'
import { cn } from '../lib/cn'
import type { ThemeId } from '../types'

/* ============================================================
   HEATT · LANDING (Tailwind + motion)
   A real product page in the app's own theme: living hero with
   a playable flare, the thirteen shelves, the companions, and
   the three atmospheres you can try on live.
   ============================================================ */

const EMBER_COUNT = 14
const EASE = [0.22, 1, 0.36, 1] as const

function LandingEmbers() {
  const embers = useMemo(
    () => Array.from({ length: EMBER_COUNT }, (_, index) => ({
      id: index,
      left: `${(index * 37) % 100}%`,
      delay: `${(index * 0.83) % 9}s`,
      duration: `${8 + (index % 5) * 1.7}s`,
      size: 4 + (index % 4),
    })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {embers.map(ember => (
        <i
          key={ember.id}
          className="absolute -bottom-2 animate-ember-rise rounded-full"
          style={{
            left: ember.left,
            width: ember.size,
            height: ember.size,
            animationDelay: ember.delay,
            animationDuration: ember.duration,
            background: 'radial-gradient(circle at 35% 30%, var(--flame-2), var(--flame-1))',
          }}
        />
      ))}
    </div>
  )
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingPage({ onEnter, onExplore, onSignIn, theme, onChooseTheme, buddyId }: {
  onEnter: () => void
  onExplore: () => void
  onSignIn: () => void
  theme: ThemeId
  onChooseTheme: (theme: ThemeId) => void
  buddyId: string
}) {
  const buddy = buddyById(buddyId)
  const featured = blogCatalog[0]

  return (
    <div className="landing-page relative min-h-screen overflow-clip text-ink">
      <LandingEmbers />

      {/* ---------------- nav ---------------- */}
      <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-line bg-paper/75 px-6 backdrop-blur-xl md:px-[max(24px,calc((100vw-1160px)/2))]">
        <button onClick={onEnter} className="flex items-center gap-2.5">
          <span className="brand-mark"><span /></span>
          <span className="font-display text-[21px] font-extrabold tracking-[-0.06em]">heatt</span>
        </button>
        <nav className="hidden items-center gap-7 text-[12px] font-semibold text-ink-soft md:flex">
          <button className="transition hover:text-ink" onClick={() => scrollToSection('shelves')}>Shelves</button>
          <button className="transition hover:text-ink" onClick={() => scrollToSection('companions')}>Companions</button>
          <button className="transition hover:text-ink" onClick={() => scrollToSection('atmospheres')}>Atmospheres</button>
          <button className="transition hover:text-ink" onClick={onSignIn}>Sign in</button>
        </nav>
        <button
          onClick={onEnter}
          className="h-10 rounded-xl bg-ember px-[18px] text-[12px] font-bold text-on-ember shadow-[0_8px_20px_var(--accent-glow)] transition hover:-translate-y-px hover:bg-ember-deep"
        >
          Enter Heatt
        </button>
      </header>

      <main className="relative z-[1]">
        {/* ---------------- hero ---------------- */}
        <section className="grid items-center gap-[clamp(34px,5vw,72px)] px-6 pb-[clamp(60px,9vh,110px)] pt-[clamp(48px,8vh,96px)] md:grid-cols-[minmax(0,1.04fr)_minmax(340px,.96fr)] md:px-[max(24px,calc((100vw-1160px)/2))]">
          <div>
            <motion.p
              className="mb-[22px] inline-flex items-center gap-2 rounded-full border border-line-strong bg-card px-[13px] py-[7px] text-[11px] font-semibold text-ink-soft"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <i className="h-[7px] w-[7px] animate-breathe rounded-full bg-flame shadow-[0_0_10px_var(--flame-1)]" />
              A calmer fire for worthwhile reading
            </motion.p>
            <motion.h1
              className="mb-[22px] font-display text-[clamp(44px,5.6vw,76px)] font-bold leading-[0.98] tracking-[-0.045em]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.06, ease: EASE }}
            >
              Read the open web.<br />
              <em className="bg-gradient-to-r from-ember via-flame to-gold bg-clip-text not-italic text-transparent">Write flares.</em><br />
              Feel the heat.
            </motion.h1>
            <motion.p
              className="mb-[30px] max-w-[54ch] text-[16px] leading-[1.7] text-ink-soft"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
            >
              Heatt turns 53 of the best free reads on the web into flares — right here, credited to their owners —
              beside your own short writing, a private journal, and small, kind rooms. No redirects. No noise. No streaks.
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            >
              <button
                onClick={onEnter}
                className="inline-flex h-[52px] items-center gap-2.5 rounded-2xl bg-ember px-6 text-[13.5px] font-bold text-on-ember shadow-[0_14px_30px_var(--accent-glow)] transition hover:-translate-y-0.5 hover:bg-ember-deep hover:shadow-[0_18px_38px_var(--accent-glow)]"
              >
                Start with your interests <ArrowRight size={16} />
              </button>
              <button
                onClick={onExplore}
                className="inline-flex h-[52px] items-center gap-2.5 rounded-2xl border border-line-strong bg-card px-[22px] text-[13.5px] font-bold text-ink transition hover:-translate-y-0.5 hover:border-ember hover:text-ember"
              >
                <Compass size={16} /> Browse the rooms
              </button>
            </motion.div>
            <motion.div
              className="mt-[34px] flex flex-wrap gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              {[
                { value: `${blogCatalog.length}`, label: 'free reads, in-app' },
                { value: `${blogCategories.length}`, label: 'curated shelves' },
                { value: '3', label: 'full atmospheres' },
              ].map(item => (
                <div key={item.label} className="grid gap-1">
                  <strong className="font-display text-[22px] font-bold leading-none text-ink">{item.value}</strong>
                  <span className="text-[10.5px] uppercase tracking-[0.05em] text-muted">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* hero stage: a live flare you can heat, art, and your buddy */}
          <motion.div
            className="relative mt-7 grid md:mt-0"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
          >
            <div className="absolute -right-4 -top-14 z-[1] w-[clamp(140px,15vw,200px)] animate-float-slower overflow-hidden rounded-[26px] border border-line shadow-lift">
              <img src="/art/landing-hero.jpg" alt="A reader beside a small ember-lit fire" className="aspect-square w-full object-cover" />
            </div>

            <div className="relative z-[2] grid animate-float-slow gap-4 rounded-[24px] border border-night-line bg-night p-6 text-night-text shadow-night">
              <div className="flex items-center gap-3">
                <SourceMark accent={featured.accent} initials={featured.initials} className="h-11 w-11 text-[12px] shadow-[0_0_0_4px_rgba(255,255,255,.06)]" />
                <div className="grid flex-1 gap-0.5">
                  <strong className="font-display text-[13px] font-bold">{featured.name}</strong>
                  <span className="font-mono text-[9.5px] text-night-copy">@{featured.domain} · flare author</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-good/50 px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-good">
                  <BadgeCheck size={11} strokeWidth={2.4} /> owner
                </span>
              </div>
              <blockquote className="m-0 font-display text-[19px] font-medium leading-[1.45] tracking-[-0.01em]">
                Every article opens inside Heatt — scraped respectfully, rendered as a flare, always credited to the writer who made it.
              </blockquote>
              <div className="flex items-center justify-between gap-3 border-t border-night-line pt-3.5">
                <HeatDemo />
                <span className="hidden font-mono text-[9px] text-night-copy sm:block">tap three times → blaze</span>
              </div>
            </div>

            <div className="absolute -bottom-12 -left-9 z-[3] drop-shadow-[0_16px_22px_rgba(25,15,8,.25)]">
              <BuddySprite buddy={buddy} size={128} onClick={onEnter} />
            </div>
          </motion.div>
        </section>

        {/* ---------------- shelves ---------------- */}
        <section id="shelves" className="border-y border-line bg-card/55 py-[clamp(64px,9vh,104px)]">
          <div className="px-6 md:px-[max(24px,calc((100vw-1160px)/2))]">
            <header className="mb-9 max-w-[620px]">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ember">The shelves</p>
              <h2 className="mb-3 mt-2 font-display text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.035em]">
                Thirteen rooms of the open web.
              </h2>
              <p className="m-0 text-[14.5px] leading-[1.7] text-ink-soft">
                Every shelf is a category with its own artwork and its own carefully reviewed sources. Pick one and start reading — inside Heatt.
              </p>
            </header>
            <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-5 [scrollbar-width:thin]">
              {blogCategories.map((category: BlogCategory, index) => {
                const art = artFor(category)
                const count = blogCatalog.filter(source => source.category === category).length
                return (
                  <motion.button
                    key={category}
                    onClick={onEnter}
                    className="group grid w-[228px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-line bg-card text-left shadow-soft transition hover:-translate-y-1.5 hover:shadow-lift"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.3), ease: EASE }}
                  >
                    <span className="relative block h-[118px] overflow-hidden bg-card-deep">
                      {art.image && <img src={art.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" />}
                      <span className="absolute right-2.5 top-2.5 rounded-full border border-line bg-card/85 px-2.5 py-1 font-mono text-[9px] font-bold text-ink backdrop-blur">{count}</span>
                    </span>
                    <span className="grid gap-1 p-4">
                      <strong className="font-display text-[14px] font-bold leading-tight text-ink">{category}</strong>
                      <span className="text-[10.5px] leading-[1.5] text-muted">{art.caption}</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ---------------- companions ---------------- */}
        <section id="companions" className="px-6 py-[clamp(64px,9vh,104px)] md:px-[max(24px,calc((100vw-1160px)/2))]">
          <header className="mb-9 max-w-[620px]">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ember">Companions</p>
            <h2 className="mb-3 mt-2 font-display text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.035em]">
              A little fire that knows you.
            </h2>
            <p className="m-0 text-[14.5px] leading-[1.7] text-ink-soft">
              Every reader gets a buddy — living in the corner of Home, chatting privately on your device, and keeping a warmth meter fed by the attention you give. Pick whoever feels like company.
            </p>
          </header>
          <BuddyShowcase onChoose={onEnter} />
        </section>

        {/* ---------------- atmospheres ---------------- */}
        <section id="atmospheres" className="border-y border-line bg-card/55 px-6 py-[clamp(64px,9vh,104px)] md:px-[max(24px,calc((100vw-1160px)/2))]">
          <header className="mb-9 max-w-[620px]">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ember">Atmospheres</p>
            <h2 className="mb-3 mt-2 font-display text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.035em]">
              Three complete themes. One tap to try.
            </h2>
            <p className="m-0 text-[14.5px] leading-[1.7] text-ink-soft">
              These aren’t dark-mode toggles — each atmosphere restyles the entire app: feed, reader, profile, landing, every room. Try one right now; the page changes with you.
            </p>
          </header>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {themeCatalog.map(item => {
              const active = theme === item.id
              const Icon = item.id === 'ember' ? Flame : item.id === 'midnight' ? Moon : PenLine
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onChooseTheme(item.id)}
                  className={cn(
                    'group overflow-hidden rounded-[20px] border bg-card text-left shadow-soft transition hover:-translate-y-1 hover:shadow-lift',
                    active ? 'border-ember shadow-[0_0_0_3px_var(--accent-soft),var(--shadow-lift)]' : 'border-line',
                  )}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={active}
                >
                  <span className="relative grid h-[124px] place-items-center overflow-hidden" style={{ background: `linear-gradient(150deg, ${item.swatches[0]}, ${item.swatches[2]}33)` }}>
                    <span className="grid gap-1.5" style={{ transform: 'translateY(2px)' }}>
                      <i className="block h-2 w-16 rounded-full" style={{ background: item.swatches[1] }} />
                      <i className="block h-2 w-24 rounded-full opacity-40" style={{ background: item.swatches[1] }} />
                      <i className="block h-2 w-20 rounded-full opacity-25" style={{ background: item.swatches[1] }} />
                    </span>
                    <span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: item.swatches[1], color: item.id === 'ember' ? '#fff7ed' : item.id === 'midnight' ? '#10120b' : '#faf9f5' }}>
                      <Icon size={15} />
                    </span>
                    {active && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ember px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-on-ember">
                        <Check size={10} strokeWidth={3} /> active
                      </span>
                    )}
                  </span>
                  <span className="grid gap-1 p-4">
                    <strong className="font-display text-[15.5px] font-bold text-ink">{item.name}</strong>
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ember">{item.note}</span>
                    <span className="text-[11.5px] leading-[1.6] text-ink-soft">{item.description}</span>
                  </span>
                </motion.button>
              )
            })}
          </div>
          <p className="mt-4 text-[11.5px] text-muted">Your atmosphere is remembered and can be changed anytime in Settings.</p>
        </section>

        {/* ---------------- principles ---------------- */}
        <section className="grid gap-4 px-6 py-[clamp(64px,9vh,104px)] md:grid-cols-3 md:px-[max(24px,calc((100vw-1160px)/2))]">
          {[
            { icon: BadgeCheck, title: 'Originals, credited', copy: 'Flares carry the owner’s name and a link home. Heatt never republishes without permission and never invents activity.' },
            { icon: Sparkles, title: 'Your choices lead', copy: 'Topics and feed controls are explicit. Your private journal never trains anything, anywhere.' },
            { icon: ShieldCheck, title: 'Small rooms, honest signals', copy: 'One fire per flare with real intensity. No scores, no popularity theatre, no streak pressure.' },
          ].map((principle, index) => (
            <motion.article
              key={principle.title}
              className="grid gap-2 self-start rounded-[20px] border border-line bg-card p-6 shadow-soft transition hover:-translate-y-1.5 hover:shadow-lift"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
            >
              <span className="mb-1 grid h-[42px] w-[42px] place-items-center rounded-2xl bg-ember-soft text-ember">
                <principle.icon size={19} strokeWidth={2} />
              </span>
              <h3 className="m-0 font-display text-[17.5px] font-bold text-ink">{principle.title}</h3>
              <p className="m-0 text-[12px] leading-[1.65] text-ink-soft">{principle.copy}</p>
            </motion.article>
          ))}
        </section>

        {/* ---------------- final CTA ---------------- */}
        <section className="bg-night px-6 py-[clamp(80px,12vh,130px)] text-center text-night-text">
          <h2 className="mb-3.5 font-display text-[clamp(32px,4vw,52px)] font-bold leading-[1.05] tracking-[-0.035em]">
            A little less noise.<br />A little more heat.
          </h2>
          <p className="mx-auto mb-8 max-w-[460px] text-[14px] leading-[1.7] text-night-copy">
            Make your first shelf, light your first flare, and let a small fire keep you company while you read.
          </p>
          <button
            onClick={onEnter}
            className="inline-flex h-[54px] items-center gap-2.5 rounded-2xl bg-flame px-8 text-[14px] font-bold text-[#14100b] shadow-[0_16px_34px_var(--accent-glow)] transition hover:-translate-y-0.5"
          >
            Make your first shelf <ArrowUpRight size={17} />
          </button>
        </section>
      </main>

      <footer className="flex flex-wrap items-center gap-7 border-t border-line px-6 py-7 text-[11.5px] text-muted md:px-[max(24px,calc((100vw-1160px)/2))]">
        <span className="font-display text-[17px] font-extrabold tracking-[-0.06em] text-ink">heatt</span>
        <p className="m-0 mr-auto">Where your mind catches fire.</p>
        <nav className="flex gap-4">
          <a className="transition hover:text-ember" href="/privacy">Privacy</a>
          <a className="transition hover:text-ember" href="/terms">Terms</a>
        </nav>
      </footer>
    </div>
  )
}
