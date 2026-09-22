# heatt — where ideas burn

A hybrid microblogging + long-form platform. Short posts (**sparks**) and full articles
(**forges**) live in the same feed and the same reading surface — nothing is truncated into a
"keep reading elsewhere" wall. Cold-start supply comes from **syndicating Dev.to**, whose API
hands back real articles as Markdown, so heatt renders them natively instead of redirecting.

```
npm install && npm run dev        # http://localhost:3000
npm run build && npm start        # production
```

Zero-cost infra: Next.js App Router, static/ISR page output, client-side localStorage state,
edge-friendly proxy routes for caching. No database in the demo; the store is swappable.

---

## Why it looks like this ("dark tech")

Near-black charcoal panels (`#0A0A0B`, never pure black), restrained colour, sharp geometry,
**luminescent gradients that read as heat**, and a WebGL ember field behind the app. Fire is not
decoration here — temperature is the ranking model, so colour carries meaning:

| token | value | meaning |
| --- | --- | --- |
| `--ht-magma` | `#FF2D12` | ignition, level-3 heat |
| `--ht-ember-300/500` | `#FF8A1F` / `#FF5C0A` | hot, active |
| `--ht-flare` / `--ht-whitehot` | `#FFC94B` / `#FFF6DE` | peak, sparks |
| `--ht-cryo-indigo/violet/teal` | `#5B4BFF` / `#8B5CF6` / `#2BE0C8` | cold, decayed, archived |

Type is fluid (`clamp()`), single-column at 65–75ch (`max-inline-size: 68ch`), with a display face
(Bricolage Grotesque), a reading face (Newsreader), a UI face (Inter) and JetBrains Mono for data.
Bodies sit at `line-height: 1.78`, headings at `1.14`, with `text-wrap: balance` on titles and
`pretty` on prose. Everything is `prefers-reduced-motion` aware, plus a user-level switch.

## The heat model

`lib/heat.ts` implements the ranking in the design doc — Newton's law of cooling over a bipartite
author↔reader graph instead of chronological or engagement-max ranking:

```
heat(article) = Σ_i  w(type_i) · T_0,i · e^(−Δt_i / τ)     · velocity bonus   (τ = 9h)
w(heat)=1 · w(blaze)=2.6 · w(ignite)=6.5 · w(save)=1.3 · w(share)=2.2 · w(reply)=1.15

Per-event τ is 9h. Aggregate counters (a post's public reaction total) cool at **3τ** and your own
re-read heat at **1.6τ** — a sum of exponentials whose events arrived at different times decays
slower than one event, so applying 9h to an aggregate would double-count age. `lib/heat.ts` says so
in the code, and `computeHeat()` returns a `trace[]` so the UI can show you the arithmetic.
score = heat + log(1+heat)·0.9 − age_h·0.35   (velocity bonus, then cliff truncation)
```

**The diffusion pass actually runs.** `rank()` builds the bipartite content↔author graph of the
visible feed once per ranking (`feedDiffusion()` in `lib/heat.ts`): an author node's temperature
is the heat *you* injected into that author's posts, weighted by their thermal mass, and one
Laplacian pass (platform `κ`, stability-clamped at 0.5) lets it warm the same author's other posts
in your feed. Ignite nyra's essay and her cold post rises — that is the "propagates to adjacent
user feeds" the doc describes, not a comment. The boost is additive in logit space
(`diffusionBoost`), heat-mode only (`new`/`top`/`contested` are deliberate alternative lenses),
deterministic, O(n), and appears as a fifth "Diffusion" row in the "why am I seeing this?" trace
whenever it contributes.

Cooling is a *promise*, not a punishment: a post never disappears, it slides into the Archive.
Feed rank modes are `heat · new · top · cliff`, and the cliff (the largest drop in crowd heat
inside the top 40) truncates the feed with an honest "the crowd went cold here" line.

Heat is a **spectrum you hold**, not a like you tap (`components/heat/HeatButton.tsx`):
0 → warm → blaze → ignition, at ~1.15s and ~2.45s of held pressure, with haptics, a shockwave,
and — at ignition — the whole card catching fire for 2.4s.

## What's in the app

- **Cinematic intro** (`components/intro/CinematicIntro.tsx`) — ~8.4s of real-time WebGL: the
  thermal field ignites, the wordmark assembles out of embers, type-scale/measure/reading-mode
  proofs flicker past. Skip is always one click or keypress away; it runs once (`introSeen`).
- **Adaptive GPU degradation** (`lib/gpu.ts` + `HeatField`) — spec §4.2, fully wired:
  `probeGpu()` profiles cores/memory/UA/touch before the first frame and seeds the quality tier;
  a frame-time governor (median of a rolling rAF window, 2.5s hysteresis) steps the tier down when
  the GPU sags (DPR cap 2→1.5→1, render scale ×0.72 then ×0.5, pointer bloom off), and if even the
  minimal tier can't hold, it swaps the canvas for a **Web-Animations-API-driven** CSS gradient
  (~0 JS per frame, compositor-owned). `webglcontextlost`/`restored` are handled: loss → CSS
  immediately, restore → shaders recompile and GL resumes. Cursor *and* gyroscope drive the focal
  distortion; the current tier is exposed as `data-gpu-tier` (and `window.__heattGpu`).
- **Onboarding** (`components/onboarding/Onboarding.tsx`) — pick interests, set thermal mass,
  choose reading defaults; seeds the first feed so nobody lands on an empty timeline.
- **Feed** — ranked sparks + forges with inline covers, link previews, polls, "why am I seeing
  this?" transparency panel, digest cards, live syndication ticker, `j/k/h/l/↵` keyboard control.
- **Reader** (`components/reader/Reader.tsx`) — a *route* (`/read/[id]`), not a redirect: reading
  progress rail, per-paragraph **heat spine** (where the crowd re-read, lingered, heated), inline
  code with syntax highlighting, footnotes/references, blockquote treatment, cover, author strip,
  reply thread, "read original" attribution for syndicated pieces, adjustable serif/measure/
  density, and paragraph-level heating.
- **Explore** — search over posts/tags/authors with heat-ranked results, trending tags, tag/board
  histograms, source filters, top authors.
- **Profile** — cover art, avatar, bio, links, thermal mass, tabs for sparks/forges/heated, and an
  editable profile (`components/profile/ProfileEditor.tsx`).
- **Heat map** (`components/heat/Heatmap.tsx` + `/heatmap`) — GitHub-style annual grid, but scored
  on **thermal output** (heats given, ignitions, reads, writes; blazes tracked as their own day
  split). Collapsed square on the profile expands through a Framer Motion morph into the dashboard:
  day-level interrogation, 7-day micro-histogram, streak as a promise, and a **generated narrative**
  (`lib/heat-narrative.ts`). The narrative is honest — every number comes from real stored data (no
  invented percentages), and it cites *the exact time* of viral moments from a bounded 200-event
  ring (`logEvent`) with a per-day timeline. Superlatives (top-10%, "best reading day on record")
  only render once you have ≥7 active days to compare against. Empty cells are neutral, never red —
  and you are never ranked against another person.
- **Share studio** (`components/share/ShareStudio.tsx`) — poster-grade PNG drawn on canvas at
  1080×1920 / 1080×1080 / 1200×675, palette auto-matched to the post's temperature, with crowd
  waveform, "thermal passport" profile variant and a year-in-heat variant. Download, copy image
  (ClipboardItem), native share sheet (Web Share Level 2 with `File`), or copy link.
- **⌘K palette** — create, navigate, toggle, and jump to heat-ranked posts and tags.
- **Compose** — spark ↔ forge with a live "promotion gauge" that nudges a spark worth expanding
  into an article, and links/polls/cover picks.

## Cold-start supply (`lib/syndicate.ts`, `app/api/*`)

`/api/feed` merges Dev.to's public article list across the boards heatt cares about
(frontend, webdev, programming, javascript, typescript, rust, design) and returns metadata only —
title, excerpt, cover, tags, author, reactions, canonical URL. `s-maxage=600,
stale-while-revalidate=86400` keeps it at the edge; the client caches 24h in localStorage.
`/api/article` fetches `body_markdown` **per read** (never stored), which is then rendered through
`lib/markdown.tsx` with highlighting. `/api/preview` is a thin Next.js wrapper over
`lib/oghead.ts`: it fetches the target and reads **only the `<head>` byte-stream**, cancelling the
reader the instant `</head>` is seen (body never downloaded), with a cap and a deadline guard for
hostile servers. `extractOgMeta` handles free-form attribute order plus the common non-standard
variants (`og:image:url`/`og:image:secure_url`, `twitter:image[:src]`, `link[rel=image_src]`),
resolves relative images against the final URL, and decodes entities. So link previews cost
kilobytes rather than full page loads — and the "we abort at `</head>`" claim is unit-tested in
Node against a 400 KB fake body. Syndicated items are labelled and attributed, and deep-link to the
canonical original.

When the network is unavailable (offline demo, blocked egress) the app degrades to the seeded
library — 7 fully written forges with structured blocks, 16 sparks, 8 profiles — and the wire
panel says so honestly instead of showing skeletons forever.

## Verification

Six suites, all headless, all run with `npm test` (if no production build exists yet, the style
audit runs `next build` once on its own — the chain is self-sufficient):

```bash
npm run test:model     # 99 assertions: heat math, diffusion ranker pass, store reducers,
                       #   GPU probe/governor, streaming OG core, narratives, seed corpus
npm run test:smoke     # 100 assertions driving the real components in jsdom
npm run test:styles    # every class rendered in the DOM compiles to a production rule
npm run test:integrity # 31 checks: assets, links, store keying, flagship wiring (no dead code)
npm run test:a11y      # rendered-DOM a11y: alt text, icon-button labels, heading outline, inputs
npm run test:bundle    # build output: art sizes, inline assets, tree-shaking
```

`test:model` compiles the pure-TS core and checks the physics against the spec
(`cool(9h) === e⁻¹`, ignite weight 6.5× ember, cliff detection, tab/handle/search
filters, streak and activity reducers, every seeded forge having real blocks). It now also
proves the flagship wiring: `diffuse()` honours κ (and clamps at 0.5), `feedDiffusion` warms an
author's sibling post but never a stranger's, igniting one of nyra's forges measurably lifts the
other one in `rank()` (with a Diffusion trace row), the GPU governor steps down on sustained lag,
respects cooldown, and drops to CSS at the floor, `readHeadOnly` aborts a 400 KB body at
`</head>` (411 bytes retained), and the heatmap narrative cites real exact-time moments without
inventing statistics.

`test:smoke` is the interesting one: it mounts `ShellProviders → BootLayer →
shell layout → page` with react-dom/client inside jsdom, stubs `next/navigation`,
`next/dynamic` and `next/link`, replaces `getContext('2d')` with a **canvas
recorder**, and then presses buttons — skip intro, walk onboarding, `j/k/h/l/↵`,
hold-to-heat through the real 2.45s timer including ignition (25 embers,
`activity.ignites`, fire chrome and its 2.4s expiry), mute from the ⋯ menu,
reply in a thread, publish a spark, build a poll → feed → vote, open a poster
and exercise every export (clipboard image, native share sheet, PNG download,
palette repaint via canvas op count ~3k→6k), offline syndicated body retry +
attribution, profile editing, ⌘K navigation, heat-grid day selection, and every
settings toggle reaching `<html>`. It fails on any console error, uncaught
rejection, or React warning.

`test:styles` renders every surface (feed, igniting card, reader, offline
reader, explore, library, notifications, settings, heatmap, profile, landing,
palette, composer, share studio, thread sheet, onboarding, intro) in jsdom,
collects every class token from the real DOM, extracts every selector from the
production CSS by unescaping Tailwind's escaped arbitrary values
(`bg-[linear-gradient(140deg,#FFD27D,#FF5C0A)]`, `text-[clamp(...)]`,
`bottom-[max(84px,calc(env(safe-area-inset-bottom)+84px))]`), and asserts that
every utility has a compiled rule and every `.ht-*` primitive is defined. It
catches the class of bug Tailwind silently drops — a typo'd token or an opacity
step not in the scale compiles to nothing.

Together they found eight bugs no build step could:

1. `useMemo` inside JSX after an early `return` in `BootLayer` — hook-order
   violation that crashed the first-visit boot.
2. Poster canvas painting a frame *before* the modal mounted its children — every
   share image would have been blank.
3. `muted` missing from the `posts` dependency list — muting did nothing until
   reload.
4. Own new posts falling below the semantic cliff — now a decaying findability
   boost for six hours.
5. `assemble()` not attaching heat — poster palette always fell back to 42° and
   `heat!.temp` threw on profile sort and reader end-card related rows.
6. `heat!` non-null assertions latent crashes for unranked lists.
7. `h-4.5` dead utility in `ShareStudio` — not in Tailwind's spacing scale, so it
   emitted no rule (height was saved by an inline style).
8. `ht-range2` duplicated inline `<style>` in landing + onboarding with different
   thumb sizes — now one `.ht-range` primitive in `globals.css`.

## Layout

```
app/                     routes (landing, feed, explore, library, notifications, settings,
   (shell)/…             heatmap, u/[handle], read/[id]) + api/{feed,article,preview}
components/gl/HeatField  WebGL thermal field (ambient + intro + cursor/gyro sparks + governor)
components/heat/         HeatButton (hold-to-heat), FireOverlay (ignition), Heatmap
components/cards/        PostCard, LinkPreview, PollBlock
components/reader/       ArticleReader — the long-form surface
components/share/        ShareStudio — canvas poster export
lib/heat.ts              heat math, diffuse()/feedDiffusion() Laplacian passes, cliff detection
lib/gpu.ts               device probe + pure frame-time governor (spec §4.2)
lib/oghead.ts            streaming <head>-only fetch + OG extraction core (spec §7.1)
lib/heat-narrative.ts    day narratives for the heatmap (spec §5.2)
lib/                     ranking/feed, store (zustand+persist), markdown, syndicate, seed
public/art/              generated cover art used by seeded forges and the landing page
```

State lives in one persisted zustand store (`heatt-store-v1`): heat given, reads, saves, shares,
follows, mutes, replies, your sparks/forges, notifications, per-day activity (with the blaze
split), a bounded 200-event memorable-moment ring, and prefs. `lib/app.tsx` wraps it in an app
context that owns navigation, the ignition queue (max 2 concurrent burns), toasts and syndication
refresh.

Everything is intentionally local-first: heat you give is real input to the ranker, the streak is
real, and the share cards are generated from that state.
