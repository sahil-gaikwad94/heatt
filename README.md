# Heatt

> Where your mind catches fire.

Heatt is a text-first social network for worthwhile expression, intentional discovery, and small communities. This repository contains the React/Vite client, an edge-compatible Hono API boundary, and the PostgreSQL/RLS foundation for a capped beta — now with in-app reading, flares, companion buddies, and three complete app-wide atmospheres.

## Run locally

```bash
npm install
npm run dev
```

For a production build and the complete local test suite:

```bash
npm run check
npm run build
npm run test:blogs
npm run test:recommendations
npm run test:content
npm run test:contrast
npm run test:e2e
```

The Vite server binds to `0.0.0.0` so it can be used in a preview environment. The Playwright configuration uses the checked npm dependencies for its headless Chromium runtime; it does not require a separately installed system browser.

## The modern client stack

- **React 19 + Vite + TypeScript** — the application layer.
- **Tailwind CSS v4** (`src/tailwind.css`) — a CSS-first utility layer whose tokens map onto the app's theme variables, so every utility is automatically theme-reactive. The redesigned surfaces (flare cards, reader, profile, landing, dialogs) are built on it.
- **Radix UI** — accessible dialog primitives (focus trap, scroll lock, Escape, aria wiring) behind a small local wrapper (`src/components/ui/Dialog.tsx`).
- **motion** — the animation system: heat bursts, avatar ignite rings, page transitions, landing choreography. Respects `prefers-reduced-motion`.
- **lucide-react** — the icon set, mapped through one `Icon` component so the whole app stays consistent.

## Product behavior in this slice

- **Read the open web inside Heatt:** blog cards no longer redirect. Opening a flare fetches the article live through privacy-friendly CORS reader endpoints (r.jina.ai, then allorigins), renders it in the in-app reader, and always credits the original owner — the publisher is the author of the flare, with the source link one tap away. A local 7-day cache keeps repeat opens instant; nothing is stored on any server.
- **Every post is a flare.** Short-form writing is composed, published, saved, and shared as flares (the API keeps its own wire value; the mapping lives at the UI boundary). The 500-grapheme budget is enforced client-side.
- **Heat, the only reaction:** one tap raises the temperature (warm → ember → blazing, intensity 1–3) with a spark burst; a fully heated item cools with a frost puff. Small flame pips on the button show the rising intensity, and a changed profile picture arrives inside an igniting ember ring.
- **Companion buddies:** every reader chooses a companion — Kindle, Spark, Noct, Cinder, or Wick. The buddy lives animated in the corner of Home (open a private, on-device chat with quick chips), owns a full interaction card with a warmth meter on your Profile, and is showcased as part of the product on the landing page. Chats are rule-based, local, and never leave the device.
- **Three complete atmospheres:** Ember (default — warm porcelain, heat orange, gold), Midnight (true black, lime glow), and Ink (paper minimalism). Chosen in Settings (or tried live from the landing page) and applied to the entire app — feed, reader, profile, landing, and every room in between.
- **A redesigned landing page** in the app's own theme: drifting embers, a playable flare with the heat button, all thirteen shelves with commissioned category artwork, the companions, the three atmospheres, and the product principles.
- **A redesigned profile:** avatar heat ring, five animated state tiles (flares, heat given, saved, rooms, shelves), the companion interaction card, explicit shelf preferences, and quiet privacy controls.
- **Original sources, not synthetic members:** the default state contains no fabricated posts, reactions, comments, follower counts, or member profiles. 53 sources across 13 category shelves, each with its own commissioned artwork.
- **Following / Rooms:** honest empty states; only real posts from the authenticated API or written by the current user appear.
- **Private by construction:** journal notes and time capsules stay local and never enter the feed scorer or share cards.
- **Real first-run onboarding:** new readers explicitly choose topics before the first shelf is built; choices remain editable in Profile and Settings.
- **Indexable public directory:** `npm run build` pre-renders all 13 category pages under `/explore/:category`, plus canonical metadata, a sitemap, and robots rules.
- **Launch basics:** installable PWA icons, social preview metadata, plain-language Privacy and Terms pages, and an allowlisted moderation queue at `/admin`.

## Content and rights boundary

The open-web reader fetches articles on demand, for the requesting reader only, and always credits the original publisher. Heatt stores only original editorial descriptions and catalog metadata; it does not copy article bodies, images, or feeds into any database. A local browser cache serves the reader; no server-side scraping or republication happens.

Wisdom research and rights metadata remain separate in `content/wisdom/`; external Wisdom entries remain review-required until a jurisdiction-aware rights decision is recorded.

## Architecture follow-up

`apps/api` forwards authenticated Supabase sessions to RLS-scoped Postgres operations, and `database/migrations/0001_foundation.sql` owns the core relationship, audience, reaction, journal, moderation, and idempotency invariants. Without configured provider credentials, the client remains local-first and the open-web directory remains useful; with `VITE_API_URL` and Supabase Auth configured, profile and community feed synchronization use the online boundary.

See [`docs/research.md`](docs/research.md) for the domain research and product decisions behind the implementation, and [`docs/recommendations-and-content.md`](docs/recommendations-and-content.md) for feed/content boundaries.
