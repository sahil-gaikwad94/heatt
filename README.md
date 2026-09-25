# heatt — a room, not a feed

A black, reading-first room. Short notes that can grow into full stories, a reader that never redirects
you, one gesture that means what you decide it means, and a share worth sending.

No leaderboards. No invented people. No numbers that describe a person. No temperature physics.

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

---

## The app

**One gesture.** Tap a piece to heat it (level 1). Hold for a second and it is blazing (2). Hold 2.2
seconds and it ignites (3) — a spark shower, and a bump on the board. Let go inside a second and the
heat is withdrawn. That is the entire engagement model, and it lives on the piece, never on the writer.

**Two kinds of writing.** A **note** is a paragraph, a link, a poll or a quote. A **story** is a title,
a standfirst and a markdown body with real reading time, a 2px progress rail and a floating pill that
hands your place back. They share one room and one card.

**A reader, not a redirect.** Syndicated pieces from the wire open in the app, credited to their real
author, with the canonical link one tap away. When the network is gone the wire says so and the bundled
library stays readable.

**A share you would send.** The story studio draws posters on canvas at export resolution — story
1080×1920, feed 1080×1350, square 1080×1080, link 1200×630 — in five themes (or auto-themed from the
piece's own heat). Download, copy to clipboard, native share sheet, or copy the deep link.

---

## The design

Cool near-black, six close steps, four platinum ink steps, **glacier** for anything live and
**champagne** for heat and commit. No orange, no green, no third hue.

```
room      #000000 → #06070A → #0B0D12 → #11141A → #181C23 → #1F242C
ink       #F2F5FA → #A3ACBD → #6B7486 → #454C5B
glacier   #6BA2FF      live: active destination, focus, links, the wire
champagne #E8D3A4      heat, and the one button that commits
```

Motion is deliberately infrequent and large: a 4.2s cinematic intro (VOID → SIGNAL → HANDOFF) on a
first visit, a four-scene onboarding that only shows movement and **never creates a profile**, a 2.2s
ignition when a piece is heated past ignition, and page changes that are one short fade. Anything that
loops is ambient, longer than seven seconds, and off under reduced motion.

`DESIGN.md` is the full system; `app/globals.css` is the implementation of it.

---

## The heat model

```
energy(t) = Σ counters · e^(−Δt/30h)  +  Σ your heat · e^(−Δt/46h)
heat      = 100 · (1 − e^(−energy / 260))
score     = log1p(energy) · (1 + yourLift)
```

Recency-weighted attention, squashed into 0–100 so it reads as one number. Your own heat cools slower
than the crowd's because you meant it. Ranking is `for-you · fresh · popular · discussed`, with a small
pull toward writers you follow and anything you kept — then a window that stops any single writer owning
the top of the board.

There is no temperature, no diffusion across a graph, no thermal mass and no reputation multiplier.
`tests/heat-model.cjs` fails if any of that returns.

---

## Rates the interface respects

| action | result |
| --- | --- |
| tap | level 1 — "heated" |
| hold ≥ 1s | level 2 — "blazing" |
| hold ≥ 2.2s | level 3 — "ignited" + spark shower |
| release before 1s | withdrawn |
| tap an ignited piece | level 1, kept (never zeroed by accident) |

---

## What is in the room

- **The house** — `@heatt`: 12 notes and 6 full essays, written for the app. No placeholder accounts.
- **The wire** — real writers syndicated from Dev.to, fetched through `app/api/feed`, cached with a
  snapshot fallback so the room is never empty and never redirects.
- **You** — an identity minted the first time you publish, never during onboarding.

Everything you do is stored locally (`heatt-store-v2` in `localStorage`). There is no account, no server
side session, and no analytics.

---

## Layout

```
app/
  page.tsx                 landing
  (shell)/
    layout.tsx             app frame: reading rail, reading pill, bottom dock
    feed/ explore/ library/ notifications/ settings/
    u/[handle]/ read/[id]/
  api/{feed,article,preview}
components/
  boot/     BootLayer (intro → onboarding → app), AppGate, ShellProviders
  shell/    Shell: TopBar, BottomDock, PageHead, BoardControls, WireStatus
  ui/       primitives (card, button, chip, meter, modal…) + motion kit
  cards/    PostCard
  reader/   ArticleReader (markdown + article blocks)
  share/    ShareStudio (canvas posters)
  compose/  Composer (note / story)
  thread/   ThreadSheet
  heat/     HeatButton, FireOverlay
  reading/  ReadingRail + ReadingDock
  intro/ onboarding/ gl/ (Atmosphere) profile/ palette/
lib/
  heat.ts   the model        feed.ts   assembly + ranking
  store.ts  persisted state  app.tsx   the React context
  syndicate.ts (wire)  markdown.tsx  motion.ts  util.ts  seed/
```

---

## Verification

```bash
npm run test:model      # decay maths, levels, ranker, tabs, store, seeds
npm run test:smoke      # drives every surface in jsdom (intro → board → reader → share)
npm run test:styles     # every rendered class has a compiled rule; every .ht-* primitive exists
npm run test:integrity  # assets, rel=noopener, alt text, store version, heat constants
npm run test:a11y       # labels, heading outline, modal semantics
npm run test:bundle     # weight and tree-shaking
npm run test            # all of the above
```

The smoke suite presses real buttons: it holds the heat control through the 2.2s ignition, mutes an
author and re-mounts the board, publishes a note, opens the story studio and asserts the canvas paints
at 1080×1920, then switches it to the square and checks it repainted. Any throw inside an effect or a
handler fails the run.
