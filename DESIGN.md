# heatt — design system

A dark interface is a **light model**, not a black background. This is the whole system: what the light
is, where it comes from, and what it is allowed to mean.

Everything here is enforced somewhere in the tree — a token in `app/globals.css`, a Tailwind colour in
`tailwind.config.ts`, or an assertion in `tests/`. If a rule in this document cannot fail a test, it is
a preference; those are marked as such.

---

## 0. The one-line version

> A cool near-black room, four steps of platinum ink, **glacier** for anything live, **champagne** for
> heat and commit — and no third colour, no temperature physics, and no number that describes a person.

---

## 1. Colour

### The room — cool near-black, six close steps

| token | value | use |
| --- | --- | --- |
| `--void` | `#000000` | true black, OLED depth. Nothing readable is drawn directly on it. |
| `--base` | `#06070A` | the floor everything sits on |
| `--surface` | `#0B0D12` | first elevation: cards, panels |
| `--elev` | `#11141A` | raised surfaces, sheets, modals |
| `--lift` | `#181C23` | hover / active elevation, control tops |
| `--top` | `#1F242C` | the top of a gradient, never a flat fill |
| `--wash` | `#272D37` | pressed states, dividers inside a control |
| `--line` / `--line-2` / `--line-3` | `rgba(255,255,255,.065 / .12 / .2)` | hairline, edge, edge you must read |

The steps are deliberately *cool* (blue-leaning) and close. A warm grey on a black page reads as dirty
at exactly the sizes we use for metadata.

### Ink — platinum, four steps

| token | value | use |
| --- | --- | --- |
| `--ink` | `#F2F5FA` | primary text, and only primary |
| `--ink-2` | `#A3ACBD` | secondary: standfirsts, card body |
| `--ink-3` | `#6B7486` | metadata: handles, timestamps |
| `--ink-4` | `#454C5B` | whispers: legal, footer, keyboard hints |

Four steps, deliberately. One grey for every secondary rank reads flat no matter how good the layout is.

### Glacier — the accent (cold, live)

| token | value |
| --- | --- |
| `--acc-50 … 900` | `#F2F7FF` → `#E2EEFF` → `#C6DEFF` → `#A3C9FF` → `#86B6FF` → `#6BA2FF` → `#4A7FE0` → `#335BA8` → `#1F3A70` → `#101E3C` |
| `--acc` | `#6BA2FF` |
| `--acc-soft` / `--acc-line` / `--acc-glow` | `rgba(107,162,255,.13 / .32 / .4)` |
| `--acc-ink` | `#04101F` — type printed **on** a glacier fill (used exactly once: the active dock item) |

Glacier means *live*: the active destination, focus rings, links, the wire dot, selection. It is never
used to mean "hot".

### Champagne — heat, and commit (warm, rare)

| token | value |
| --- | --- |
| `--champ` | `#E8D3A4` |
| `--champ-soft` / `--champ-line` | `rgba(232,211,164,.13 / .3)` |
| `--heat-soft` / `--heat-line` / `--heat-glow` | `rgba(232,211,164,.12 / .34 / .42)` |
| `--heat-hot-line` | `rgba(244,226,180,.6)` |

Champagne is the **only warm value in the building**. It owns two things and nothing else:

1. **Heat** — `.ht-heat-btn` levels, `.ht-spark`, the ignited card's shock, the heat ring around an avatar.
2. **Commit** — the one button that finishes an action: `.ht-btn--heat`, `.ht-round`, `.ht-dock-fab`,
   `.ht-share__action[data-primary]`, the swipe-to-start fill, eyebrow rules, chapter numerals.

If a screen needs emphasis and it is neither heat nor commit, it uses glacier or it uses ink.

### Status

`--pos #7FD0B0` · `--warn #E8C07A` · `--neg #FF8F8F`. These appear only in settings, validation and
toasts. They are never part of a card's visual language.

### Hard rules

- **No ember/orange.** The warm end of the palette is champagne, at 13–42% opacity, never a fill.
- **No saturated green.** The cool end is glacier, a blue.
- **No third hue.** Every gradient in the app interpolates within one hue or between adjacent room steps.
- **Heat has no physics.** No kelvin, no "cold", no "molten", no temperature, no diffusion, no thermal
  mass, no reputation multiplier. `tests/heat-model.cjs` and `tests/integrity-audit.cjs` fail if the
  vocabulary or the maths comes back.

---

## 2. Light & elevation

On black there is no light to cast a shadow, so depth is built from three devices:

1. **A value step** — `surface → elev → lift`, each a few percent apart.
2. **A lit top edge** — `inset 0 1px 0 rgba(255,255,255,.05–.09)`, the single most important trick in
   the system: it is what makes a black card look like a *surface* rather than a hole.
3. **An ambient pool** — a wide, very soft black shadow below (`--shadow-1/2/3`), plus `--shadow-hot`
   for the one control that is currently committing.

Glass recipes (`--glass-1/2/3`) are gradients, not `backdrop-filter` alone: the filter blurs, the
gradient gives the surface an interior. Where `backdrop-filter` is unsupported the gradient still
carries the panel.

Radii: `--r-xs 8` · `--r-sm 12` · `--r-md 16` · `--r-lg 22` · `--r-xl 28` · `--r-2xl 36`. Cards use
`--r-lg`, sheets `--r-xl`, media `--r-2xl`. Nothing is a square corner except a hairline.

---

## 3. Type

| family | role |
| --- | --- |
| **Bricolage Grotesque Variable** | display: headlines, wordmark, chapter numbers, titles |
| **Inter Variable** | interface: every control, every label, every line of metadata |
| **Newsreader Variable** | reading: long-form prose, pull quotes, the reader's body |
| **JetBrains Mono** | data: heat numbers, counters, code, timestamps |

Sizes are fluid (`--fs-micro … --fs-hero`), so a phone gets proportionally larger type than a laptop
without a single media query. The reader sets body copy at `--fs-base` with a `--measure` of 620 /
720 / 860px (narrow / normal / wide) and `data-serif="true"` switches prose to Newsreader. Density
(`data-density="dense|normal|cozy"`) scales the reading sheet, not the chrome.

Rules: two weights per screen (400 + 600/700); tracking tightens as size grows (`-0.02em` at
`--fs-lg`, `-0.045em` at `--fs-hero`); numerals in UI are always `font-variant-numeric: tabular-nums`
via `.ht-num`.

---

## 4. Components

Primitives live in `components/ui/primitives.tsx` (visual) and `components/ui/motion.tsx` (behaviour).
Screens compose them and never re-invent a radius, a duration or a colour.

| primitive | what it is |
| --- | --- |
| `.ht-card` | the one container: hairline, lit top edge, `--r-lg`. `--pad` for internal air. |
| `.ht-btn` | base button. `--heat` (champagne, commits), `--quiet` (room step), `--ghost`, `--glass` |
| `.ht-round` | the circular commit control; `--sm` in card footers, full size in the reader |
| `.ht-chip` | metadata pill; tones `plain`, `--heat` (champagne), `--iris` (glacier) |
| `.ht-heat-btn` | the gesture: tap → 1, hold 1s → 2, hold 2.2s → ignition (3) + spark shower |
| `.ht-spark` | the spark particle (champagne, 2.2s, removed after) |
| `.ht-shock` | the one-frame ring on an ignited card |
| `.ht-dock` / `.ht-dock-item` | floating pill navigation, white active pill, 52×46 hit area |
| `.ht-dock-fab` | the single commit FAB (champagne) |
| `.ht-topbar` | sticky bar that densifies on scroll (blur + border appear) |
| `.ht-tabrail` / `.ht-tab` | segmented control with a `layoutId` pill |
| `.ht-input` / `.ht-switch` | form primitives; focus uses glacier, never champagne |
| `.ht-meter` | progress bar inside a card (reading) |
| `.ht-reading-pill` | the floating "continue reading" pill |
| `.ht-progress-rail` | the 2px reading rail; only on `/read/*` |
| `.ht-prose` / `.ht-code` / `.ht-block` | the reading sheet: measure, rhythm, code, callouts |
| `.ht-modal` / `.ht-scrim` / `.ht-sheet` | overlay shells |
| `.ht-masonry` / `.ht-tile` | the profile grid |
| `.ht-swipe` | swipe-to-start (onboarding) and swipe-to-dismiss |
| `.ht-badge` / `.ht-avatar-ring` / `.ht-stats` | profile only: floating badges, conic avatar ring, work counts |

Page-level pieces: `TopBar`, `BottomDock`, `PageHead`, `BoardControls`, `WireStatus`, `AvatarCluster`
(`components/shell/Shell.tsx`), `Reveal`, `WordReveal`, `Stagger`, `Parallax`, `Tilt`, `CountUp`,
`AmbientGlow`, `useInViewSafe` (`components/ui/motion.tsx`).

Empty states are a component (`Empty`), not a sentence: eyebrow, title, one line of body, one action.

---

## 5. Motion

The rule is **less often, bigger when it happens**. Nothing loops at reading speed.

| | |
| --- | --- |
| easings | `EASE [.22,1,.36,1]`, `EASE_OUT [.16,1,.3,1]`, `EASE_IN [.6,0,.2,1]` |
| durations | micro `.16` · fast `.24` · base `.34` · slow `.64` · cinema `1.2` |
| springs | dock pill (460/36), reading rail (220/40), avatar ring (300/22) |
| entrances | page `.42`, card `.5` with a `min(.18, i × .045)` stagger, intro acts 4.2s total |
| exits | `.22`, always shorter than the entrance |

Named moments, in order of size:

1. **Cinematic intro** — three acts (VOID → SIGNAL → HANDOFF), 4.2s, one half-resolution canvas, fully
   skippable by any key, click or the Skip control. Runs once, on a first visit only.
2. **Onboarding** — four scenes, movement demonstrations (room → reading → heat → sharing), one
   gesture. 8s per scene, `←/→` to move, `Enter` to finish. **Never asks for anything and never
   creates a profile.**
3. **Ignition** — the heat gesture's payoff: a conic charge ring, then a 2.2s spark shower on the card.
   Once per ignition; the card is still afterwards.
4. **Share studio** — frames you step through with a 7s auto-advance, pausable by holding.

Loops are ambient and slow (glow drift 18–24s, grain, the wire dot's breathe) and every one of them
stops when `data-reduce-motion="true"`.

Reduced motion is not a courtesy branch: `useMotionPrefs()` reads both the OS setting and the in-app
preference, and every reveal degrades to *visible*, every parallax to *static*, and the intro to a
single state change. `useInViewSafe` falls back to "seen" when `IntersectionObserver` is missing, so a
reveal can never be load-bearing for whether text is on screen.

---

## 6. Screens

| route | what it is |
| --- | --- |
| `/` | landing: hero in one light, what the room refuses, three chapters, the palette laid out as evidence |
| `/feed` | the board: one feature story, then cards behind a single filter rail, then the wire status |
| `/explore` | real search field, topic rail from the actual corpus, writers, results |
| `/library` | two shelves — kept, and reading (with progress meters); local-only, said out loud |
| `/notifications` | "what came back": heat and replies derived from your own pieces, plus a digest |
| `/settings` | reading (size, measure, serif), motion, ignition, haptics, identity, clear-device |
| `/u/[handle]` | profile in black: parallax cover, conic avatar ring, floating badges, work counts, tabbed grid |
| `/read/[id]` | the reader: 2px rail, chrome that fades, type panel, keep/share, ignition, attribution |

The app shell is one bottom dock, one search affordance, one commit FAB. Nothing else is pinned to the
viewport, so every screen is free to use its whole height.

There are **no fake people** in the interface: the house (`@heatt`), real writers syndicated from the
wire, and you. There are **no stats about you**: the profile counts stories, notes and kept pieces.
Heat is shown on pieces, never on a person.

---

## 7. Accessibility & performance

- Every icon-only control has an `aria-label`; every overlay is a labelled dialog; every rail is a
  `role="tablist"`/`role="progressbar"` with real values (`tests/a11y-audit.cjs`).
- Focus is always visible and always glacier (`--acc-line`), never champagne — champagne is information,
  glacier is position.
- Tap targets are ≥ 44px in the dock, ≥ 36px everywhere else; the heat control is 44px because it is a
  gesture.
- Contrast: body copy uses `--ink` / `--ink-2` on `--surface` or darker; `--ink-3` is metadata only;
  `--ink-4` is never load-bearing.
- The intro canvas renders at half resolution and stops on `visibilitychange`; the ambient field is
  pure CSS gradients, so it costs no paint on scroll.
- Bundle: no icon library, no UI kit, no CSS-in-JS. One `framer-motion`, four fonts, `zustand`, and
  `unified`/`remark` for markdown. `tests/bundle-audit.cjs` guards against additions here.

---

## 8. How this is verified

| command | what it proves |
| --- | --- |
| `npm run test:model` | decay maths, levels, ranker, tabs, store, seeds — and that no thermal-mass physics returns |
| `npm run test:smoke` | the app is driven in jsdom: intro → tour → board, heat gesture to ignition, muting, replying, publishing, reader, share canvas, ⌘K, settings |
| `npm run test:styles` | every class actually rendered has a compiled rule in the built CSS; every `.ht-*` primitive exists |
| `npm run test:integrity` | assets, `rel=noopener`, alt text, store version, heat constants |
| `npm run test:a11y` | labels, headings, contrast-by-token, modal semantics |
| `npm run test:bundle` | weight, tree-shaking, inline assets |

A change to colour, motion or type that is not represented in one of those files is a preference, not a
rule — add the assertion or drop the claim.
