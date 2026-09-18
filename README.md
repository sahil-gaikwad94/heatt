# Heatt

> Where your mind catches fire.

Heatt is a text-first social network for worthwhile expression, intentional discovery, and small communities. This repository contains the working React/Vite product slice: a responsive feed, Rooms, Create, Wisdom, private Journal, Profile & privacy controls, client-side share cards, recommendation explanations, Feed Tuner, Discovery Roulette, Curiosity Trail, and the Kindle editorial guide character.

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run check
npm run build
npm run preview
```

The Vite server binds to `0.0.0.0` so it can be used in a preview environment.

## Product behavior in this slice

- **Finite For You feed:** scores seeded public posts from explicit topics, follows, rooms, freshness, novelty, and exploration; then shows a stopping point.
- **Following / Rooms:** separate, understandable feed modes with chronological or membership-aware filtering.
- **One Fire per thought:** an accessible intensity menu supports 1–3 and toggles the reaction off; repeated taps cannot create repeated reactions.
- **Private by construction:** journal notes are stored locally under the browser's Heatt state and are never passed into the feed scorer or share card content.
- **500 grapheme budget:** the composer enforces the product's short-form limit client-side. The server must enforce the same invariant when the Supabase API is added.
- **Local cards:** public post and wisdom cards render to a browser canvas for a downloadable 1080 × 1080 PNG; no image API is required.
- **Three atmospheres:** Ember, Midnight, and Paper are the only visual themes. The theme choice is persisted locally.

## Architecture follow-up

The checkout originally contained only `AGENTS.md` and `ARCHITECTURE_AND_ENGINEERING.md`; there was no API, schema, auth configuration, or migration history to safely extend. This client intentionally has no fake network layer or privileged credentials. The production boundary remains the one described by the architecture documents: Supabase Auth + PostgreSQL/RLS behind a thin TypeScript API, with idempotent mutations and database-enforced privacy rules.

See [`docs/research.md`](docs/research.md) for the domain research and product decisions behind the implementation.
