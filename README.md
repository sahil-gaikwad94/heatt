# Heatt

> Where your mind catches fire.

Heatt is a text-first social network for worthwhile expression, intentional discovery, and small communities. This repository contains the React/Vite client, an edge-compatible Hono API boundary, and the PostgreSQL/RLS foundation for a capped beta: a responsive open-web feed, Rooms, Create, Wisdom, private Journal, editable profiles, client-side share cards, deterministic community recommendations, Feed Tuner, Discovery Roulette, Curiosity Trail, Highlight & Annotate, Practice Journeys, Ask the Room helpful marks, private Time Capsules, and the Kindle editorial guide character.

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
npm run test:e2e
```

The Vite server binds to `0.0.0.0` so it can be used in a preview environment. The Playwright configuration uses the checked npm dependencies for its headless Chromium runtime; it does not require a separately installed system browser.

## Product behavior in this slice

- **Infinite open-web feed:** the default cold-start feed appends another six cards as its sentinel nears the viewport. The complete 53-source catalog is organized into 13 category shelves. In the unfiltered “All” view, a new, visibly labelled reading loop begins after every source has appeared; a filtered category has an honest ending.
- **Original sources, not synthetic members:** the default state contains no fabricated posts, reactions, comments, follower counts, or member profiles. Every external card names and links to the original publisher. Heatt stores only original editorial descriptions and catalog metadata; it does not copy article bodies, images, or feeds.
- **Useful before network effects:** each destination offered substantial free-to-read material when reviewed on September 18, 2026. Individual publishers may still offer optional memberships, newsletters, books, or other paid products. Source links should be reviewed periodically because external availability can change.
- **Following / Rooms:** these views now start with honest empty states and only display posts received from the authenticated API or created by the current user.
- **One Fire per thought:** an accessible intensity menu supports 1–3 and toggles the reaction off; repeated taps cannot create repeated reactions.
- **Private by construction:** journal notes are stored locally under the browser's Heatt state and are never passed into the feed scorer or share card content.
- **500 grapheme budget:** the composer enforces the product's short-form limit client-side. The server must enforce the same invariant when the Supabase API is used.
- **Local cards:** public post and Wisdom cards render to a browser canvas for a downloadable 1080 × 1080 PNG; no image API is required.
- **Real first-run onboarding:** new readers explicitly choose topics, preferred voices, and intent before the first shelf is built. Choices remain editable in Profile.
- **Indexable public directory:** `npm run build` pre-renders all 13 category pages under `/explore/:category`, plus canonical metadata, a sitemap, and robots rules. The source catalog is useful to search engines without executing React.
- **Launch basics:** installable PWA icons, social preview metadata/image, plain-language Privacy and Terms pages, and an allowlisted moderation queue at `/admin` are included.
- **Three atmospheres:** Ember, Midnight, and Paper are the only visual themes. The theme choice is persisted locally.

## Content and rights boundary

The open-web directory is a link catalog, not a republication system. Entries in [`src/data/blogCatalog.ts`](src/data/blogCatalog.ts) contain a source name, canonical destination, category, publisher type, discovery tags, and an original Heatt description. The catalog contract is checked by `npm run test:blogs`.

Wisdom research and rights metadata remain separate in `content/wisdom/`; external Wisdom entries remain review-required until a jurisdiction-aware rights decision is recorded.

## Architecture follow-up

`apps/api` forwards authenticated Supabase sessions to RLS-scoped Postgres operations, and `database/migrations/0001_foundation.sql` owns the core relationship, audience, reaction, journal, moderation, and idempotency invariants. Without configured provider credentials, the client remains local-first and the open-web directory remains useful; with `VITE_API_URL` and Supabase Auth configured, profile and community feed synchronization use the online boundary.

See [`docs/research.md`](docs/research.md) for the domain research and product decisions behind the implementation, and [`docs/recommendations-and-content.md`](docs/recommendations-and-content.md) for feed/content boundaries.
