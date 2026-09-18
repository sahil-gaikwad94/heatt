# Heatt

> Where your mind catches fire.

Heatt is a text-first social network for worthwhile expression, intentional discovery, and small communities. This repository now contains the working React/Vite client, an edge-compatible Hono API boundary, and the PostgreSQL/RLS foundation for a launchable product: responsive feed, Rooms, Create, Wisdom, private Journal, editable profiles, client-side share cards, recommendation explanations, Feed Tuner, Discovery Roulette, Curiosity Trail, and the Kindle editorial guide character.

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

The checkout originally contained only `AGENTS.md` and `ARCHITECTURE_AND_ENGINEERING.md`; the implementation now adds the first real product boundary instead of a fake network layer. `apps/api` forwards authenticated Supabase sessions to RLS-scoped Postgres operations, and `database/migrations/0001_foundation.sql` owns the core relationship, audience, reaction, journal, moderation, and idempotency invariants. Without configured provider credentials, the client remains local-first and fully usable; with `VITE_API_URL` and Supabase Auth configured, profile and feed synchronization use the online boundary.

See [`docs/research.md`](docs/research.md) for the domain research and product decisions behind the implementation.
