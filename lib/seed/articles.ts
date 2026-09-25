import type { Article } from '../types';

/* ============================================================================
   heatt Originals — the house library.

   Six essays written by @heatt, stored as structured blocks so the reader
   renders them natively: no redirects, no missing images, nothing to load
   from anyone else's server.
   ==========================================================================*/

export const ORIGINALS: Article[] = [
  {
    id: 'orig-room',
    kind: 'forge',
    title: 'A room, not a feed',
    dek: 'We deleted the scoreboard, the counters, the streaks and the physics. What is left is a quiet place to read — and a single number that only ever describes the writing.',
    author: 'heatt',
    tags: ['design', 'product', 'attention'],
    cover: '/art/obsidian-atelier.jpg',
    accent: '#E8D3A4',
    date: '2026-09-25T07:30:00Z',
    minutes: 8,
    reactions: 486,
    comments: 52,
    editorsPick: true,
    blocks: [
      {
        t: 'p',
        text: 'Every social product eventually grows a scoreboard. It starts as a like count, then a rank, then a "top 1%" badge, and within two years the product is about the scoreboard and the writing is the excuse. We built that version of heatt first, and then we spent a month removing it.',
      },
      {
        t: 'p',
        text: 'What we removed: reputation multipliers, "thermal mass", a temperature read-out in kelvin, a seven-day trend sparkline, a 365-day activity grid, reading receipts, and a weekly "your year in review" poster. All of it was true. All of it was measurable. None of it helped anyone read.',
      },
      { t: 'h', text: 'The test we now apply', id: 'the-test' },
      {
        t: 'p',
        text: 'Before anything ships, it has to answer one question: *does this help a person finish a piece of writing?* A streak counter fails that test — it rewards opening the app, not reading it. A leaderboard fails it — it makes writing competitive in a way that rewards volume. A temperature gauge fails it — it asks the reader to interpret a metaphor to find out whether a paragraph was any good.',
      },
      {
        t: 'quote',
        text: 'If a number cannot change what you decide to read next, it is decoration with a decimal point.',
        cite: 'the house rule we broke most often',
      },
      { t: 'h', text: 'What survived', id: 'what-survived' },
      {
        t: 'p',
        text: '**Heat.** One gesture, three levels, shown on the piece itself and nowhere else. Tapping heats something quietly. Holding means it matters. Holding all the way through ignites it, and it moves up the board for a while. That is the entire engagement model.',
      },
      {
        t: 'p',
        text: '**The library.** Saved pieces, newest first, nothing ranked. It is the only place in the product that accumulates, and it accumulates on purpose.',
      },
      {
        t: 'p',
        text: '**The progress rail.** Two pixels at the top of the screen that tell you how far into a story you are, and a small pill you can tap to pick the story back up wherever you are in the app.',
      },
      {
        t: 'callout',
        kind: 'note',
        title: 'A smaller app is a slower app',
        text: 'Removing features did not make heatt quieter by accident. It removed every reason to open the app that was not reading, and the session length went up while session count went down. That is the trade we wanted.',
      },
      { t: 'h', text: 'The uncomfortable part', id: 'uncomfortable' },
      {
        t: 'p',
        text: 'A product with no scoreboard cannot fake momentum. There is no "12 people are reading this now" to borrow credibility from. The writing has to carry it, and the interface has to get out of the way so that it can.',
      },
      {
        t: 'p',
        text: 'So that is the whole product: black surfaces that stay out of the way, one accent that means *this is happening*, a reader that never redirects you, a share that produces something worth sending, and no invented people anywhere in it.',
      },
    ],
  },
  {
    id: 'orig-heat',
    kind: 'forge',
    title: 'Heat, without the physics',
    dek: 'The old ranker modelled the platform as a cooling body. It was elegant to write and impossible to trust. Here is the small, honest model that replaced it.',
    author: 'heatt',
    tags: ['engineering', 'ranking', 'product'],
    cover: '/art/signal-grid.jpg',
    accent: '#A3C9FF',
    date: '2026-09-24T18:15:00Z',
    minutes: 7,
    reactions: 372,
    comments: 41,
    blocks: [
      {
        t: 'p',
        text: 'The first version of heatt ranked content by simulating a cooling body. Engagement injected "temperature", temperature diffused across a graph of users, and reputation acted as "thermal mass". It produced good-looking curves and a horrible debugging experience: every bug was a physics question.',
      },
      {
        t: 'p',
        text: 'Ranking is a product decision that happens to use arithmetic. It should be readable in one file, by one person, in one sitting.',
      },
      { t: 'h', text: 'The model', id: 'the-model' },
      {
        t: 'p',
        text: 'Two terms. **Volume** is what other people did: reactions, replies, reposts, weighted and faded by age. **Lift** is what you did: your heat level, whether you finished it, whether you kept it. Heat is their sum, squashed into 0-100.',
      },
      {
        t: 'code',
        lang: 'ts',
        caption: 'lib/heat.ts — the entire ranking model',
        code: [
          'const energy =',
          '  raw * fade(ageHours, 30)          // volume: public counters, 30h constant',
          '  + personal * fade(sinceHours, 46); // lift: your heat, 46h constant',
          '',
          'const heat  = 100 * (1 - Math.exp(-energy / 260));',
          'const score = Math.log1p(energy) * (1 + Math.min(2.2, lift / 6));',
        ].join('\n'),
      },
      {
        t: 'p',
        text: 'That is it. `fade()` is an exponential, `260` is a squash constant chosen so a story with a few hundred reactions lands in the eighties, and the `lift` multiplier is capped so your own enthusiasm can promote a piece you care about without owning the feed.',
      },
      { t: 'h', text: 'What we removed and why', id: 'removed' },
      {
        t: 'ul',
        items: [
          'Reputation multipliers — they made an author’s next piece rank for reasons that had nothing to do with the piece.',
          'Graph diffusion — interesting mathematics, invisible to the reader, and impossible to explain in a settings screen.',
          'Cliff truncation — the feed used to end at a detected drop in engagement. A feed that hides things is a feed you cannot trust.',
          'Velocity and trend curves — nobody has ever decided what to read from a sparkline.',
        ],
      },
      { t: 'h', text: 'Diversity, priced in', id: 'diversity' },
      {
        t: 'p',
        text: 'The one thing we kept from the old system is a mild author spread: after ranking, a run of pieces from the same writer is broken up so the top of the board is never one voice.',
      },
      {
        t: 'callout',
        kind: 'heat',
        title: 'Heat is a signal, not a score',
        text: 'It is displayed on the piece, it decays on its own, and it is never attached to a person. There is no profile rank anywhere in heatt, and there never will be.',
      },
    ],
  },
  {
    id: 'orig-sharing',
    kind: 'forge',
    title: 'Shares that survive the share sheet',
    dek: 'Most "share" buttons export a URL and hope. We draw a real poster at export resolution — three frames, five themes, four formats — and the preview is the file.',
    author: 'heatt',
    tags: ['design', 'sharing', 'motion'],
    cover: '/art/story-canvas.jpg',
    accent: '#E8D3A4',
    date: '2026-09-24T09:40:00Z',
    minutes: 6,
    reactions: 298,
    comments: 26,
    blocks: [
      {
        t: 'p',
        text: 'A link is not a share. It is a promise that something interesting exists somewhere else, which is exactly what the person you sent it to does not have time for. Apple Music solved this for songs by exporting a *thing*: cover, title, artist, a gradient that belongs to the record. Medium solved it for essays by exporting an elegant block of type.',
      },
      {
        t: 'p',
        text: 'We wanted both registers in one studio, and we wanted the preview to be the actual export — the same pixels, at the same resolution, drawn once.',
      },
      { t: 'h', text: 'Three frames, always', id: 'frames' },
      {
        t: 'ol',
        items: [
          '**Cover** — the piece, its image, and the one line you chose from it.',
          '**The line** — the passage, set in reading type at poster scale, with the source underneath.',
          '**Signature** — who wrote it, who sent it, and the mark of the room it came from.',
        ],
      },
      {
        t: 'p',
        text: 'Three frames is a constraint that makes the studio fast to use: pick a format (story 9:16, feed 4:5, square 1:1, link 1.91:1), pick a theme, and every frame is already laid out. No drag handles, no font pickers, no canvas the size of a spreadsheet.',
      },
      {
        t: 'img',
        src: '/art/deep-read.jpg',
        alt: 'A long-form story laid out on a dark reading surface',
        caption: 'Cover frames inherit the piece’s own artwork and tint it with the house theme.',
      },
      { t: 'h', text: 'Drawn, not screenshotted', id: 'drawn' },
      {
        t: 'p',
        text: 'The poster is painted with the canvas API at 1080×1920 — no DOM rasteriser, no foreignObject tricks, no mystery padding. Text is measured, wrapped, and optically aligned by hand, which is the only way to get a headline to sit correctly next to a portrait at that size.',
      },
      {
        t: 'callout',
        kind: 'note',
        title: 'Everything works offline',
        text: 'Download as PNG, copy to the clipboard, or hand a File to the native share sheet. If the share sheet is unavailable, the studio says so and offers the file instead of failing silently.',
      },
      {
        t: 'p',
        text: 'The result is that sending something from heatt feels like sending a page rather than a notification — and the person who receives it can read the whole piece behind it, without an account and without a redirect.',
      },
    ],
  },
  {
    id: 'orig-dark',
    kind: 'forge',
    title: 'Designing black: a light model for dark interfaces',
    dek: 'Dark mode is usually a filter applied to a light design. It should be a light model: know where the light comes from, how far it travels, and what it is allowed to mean.',
    author: 'heatt',
    tags: ['design', 'colour', 'typography'],
    cover: '/art/nocturne-ui.jpg',
    accent: '#86B6FF',
    date: '2026-09-23T20:10:00Z',
    minutes: 9,
    reactions: 522,
    comments: 61,
    editorsPick: true,
    blocks: [
      {
        t: 'p',
        text: 'A drop shadow has nothing to cast on black. That single sentence breaks most dark themes: they keep the elevation system from the light design, the shadows disappear, and every surface floats in the same plane. The fix is not more shadow. It is a different way of describing depth.',
      },
      { t: 'h', text: 'One: value is the elevation', id: 'value' },
      {
        t: 'p',
        text: 'Five neutrals, each a few percent apart, in cool near-black rather than pure grey. Read at arm’s length the steps are obvious; read closely they are almost invisible, which is exactly the register you want.',
      },
      {
        t: 'code',
        lang: 'css',
        caption: 'the room',
        code: [
          '--void:    #000000;  /* the page bed, OLED depth      */',
          '--base:    #08080A;  /* the floor everything sits on  */',
          '--surface: #0E0E11;  /* cards, panels, first lift     */',
          '--elev:    #141418;  /* rails, sheets, pinned chrome  */',
          '--lift:    #1B1B20;  /* hover and control tops        */',
        ].join('\n'),
      },
      { t: 'h', text: 'Two: every surface has a lit edge', id: 'edge' },
      {
        t: 'p',
        text: '`0 1px 0 rgba(255,255,255,.06) inset` — one line of CSS does more for perceived depth on black than any blur radius. It reads as a light source above the screen, which is how we actually see physical edges.',
      },
      { t: 'h', text: 'Three: ink has four steps, not two', id: 'ink' },
      {
        t: 'p',
        text: 'Primary text, secondary, metadata, whisper. A dark interface that uses one grey for everything below primary looks flat no matter how good the layout is, because the eye cannot separate "less important" from "disabled".',
      },
      { t: 'h', text: 'Four: one accent that means something', id: 'accent' },
      {
        t: 'p',
        text: 'The room is cool near-black — five steps, each a couple of percent apart. **Champagne** `#E8D3A4` is the only warm colour in the building: it belongs to heat, to the button that commits, to a number that just moved. **Glacier** `#6BA2FF` is the chrome — the active destination, a link, a live indicator. Nothing else is coloured, ever.',
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'The green trap',
        text: 'High-chroma green on black is the single most worn-out accent in dark UI, and it makes every product look like the same terminal. If your accent could belong to any app, it is not an accent — it is a default.',
      },
      { t: 'h', text: 'Five: motion is light, not decoration', id: 'motion' },
      {
        t: 'p',
        text: 'Two easing curves and one spring. Durations scale with distance and mass. Anything that loops is ambient and longer than seven seconds — a subtle movement repeated at reading speed becomes a metronome. Fewer movements, each one bigger, none of them repeated.',
      },
      {
        t: 'links',
        items: [
          { label: 'DESIGN.md', href: '#/design', note: 'the full token sheet, in the repo' },
          { label: 'The room, not a feed', href: '#/orig-room', note: 'what we removed' },
          { label: 'Heat, without the physics', href: '#/orig-heat', note: 'the model, in one file' },
        ],
      },
    ],
  },
  {
    id: 'orig-reading',
    kind: 'forge',
    title: 'Read here, in the same room',
    dek: 'The reader is the product. It never redirects you, never asks you to accept cookies, and never loses your place — even when you leave it.',
    author: 'heatt',
    tags: ['reading', 'typography', 'product'],
    cover: '/art/deep-read.jpg',
    accent: '#C6DEFF',
    date: '2026-09-23T11:20:00Z',
    minutes: 6,
    reactions: 341,
    comments: 33,
    blocks: [
      {
        t: 'p',
        text: 'A long piece of writing is a commitment. Most apps repay it with an interstitial, a cookie bar, a newsletter modal and a layout that shifts twice while you are reading the first paragraph. We treat opening a story as the moment the product should become invisible.',
      },
      { t: 'h', text: 'Measure and rhythm', id: 'measure' },
      {
        t: 'p',
        text: 'Body type is set in Newsreader at a 1.72 line-height with a measure capped between 65 and 75 characters. Headings tighten to 1.12 and pull negative tracking, so the page has two clear voices instead of one loud one. Every paragraph is a separate element with its own entrance — no layout shifts, no reflow when an image loads, because the image already reserved its space.',
      },
      { t: 'h', text: 'Chrome that hovers, not chrome that stays', id: 'chrome' },
      {
        t: 'p',
        text: 'A two-pixel progress rail sits at the very top of the viewport. It costs nothing, it is always exactly where you look for it, and it is the only persistent piece of interface in the reader. Actions — heat, keep, share — surface on scroll-settle and then leave.',
      },
      {
        t: 'quote',
        text: 'A reading interface should be measurable in pixels of ink, not in features.',
        cite: 'heatt design notes',
      },
      { t: 'h', text: 'Coming back', id: 'coming-back' },
      {
        t: 'p',
        text: 'Progress is stored per story, hard-capped at 100 and never rounded down when you scroll back up. Leave at 61% and a small pill floats over the rest of the app offering to take you back — and quietly hides itself if you are already in the reader.',
      },
      {
        t: 'callout',
        kind: 'note',
        title: 'No reading receipts',
        text: 'We used to export a card that said how much you had read this year. It was beautiful and it was a lie about what reading is. Progress belongs to the story, not to your record.',
      },
      {
        t: 'p',
        text: 'Everything else — code blocks with a copy button, figures with captions, footnote-style links that stay inside the app — exists so that a 12 minute read is actually 12 minutes of reading.',
      },
    ],
  },
  {
    id: 'orig-attention',
    kind: 'forge',
    title: 'Attention when nothing is for sale',
    dek: 'The only honest metric for a reading product is what people finish. Everything else is a proxy that eventually becomes a target.',
    author: 'heatt',
    tags: ['attention', 'product', 'writing'],
    cover: '/art/quiet-kiln.jpg',
    accent: '#E8D3A4',
    date: '2026-09-22T14:00:00Z',
    minutes: 5,
    reactions: 264,
    comments: 24,
    blocks: [
      {
        t: 'p',
        text: 'We do not sell attention. There is no ad system, no ranking auction, no engagement objective to satisfy. That sounds like a moral position; mostly it is a design constraint, and it turns out to be the most useful one we have.',
      },
      { t: 'h', text: 'Completion beats consumption', id: 'completion' },
      {
        t: 'p',
        text: 'The number we actually care about is how many pieces people read to the end. It is not a number the interface displays, and it cannot be gamed without writing something people want to finish. When you cannot buy attention, the only way to earn it is to be worth the time.',
      },
      {
        t: 'img',
        src: '/art/aurora-drift.jpg',
        alt: 'A dark gradient surface lit from one corner',
        caption: 'Black surfaces, one lit edge, one accent. The interface should read as a material, not a screen.',
      },
      { t: 'h', text: 'What that changes', id: 'what-changes' },
      {
        t: 'ul',
        items: [
          'No infinite feed. The board ends, and it says so.',
          'No autoplay, no countdown, no "you might also like" rail inside the reader.',
          'No notifications for anything you did not ask for. A digest, at most, and one you can turn off in a single switch.',
          'No dark patterns on the way out. Leaving is one tap and never ambiguous.',
        ],
      },
      {
        t: 'p',
        text: 'The result is a product with no growth loop and no engagement lever — which means the only thing left to improve is the reading itself. That is a much better place to spend a year.',
      },
    ],
  },
];
