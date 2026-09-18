# ADR 0001: Ship the product surface and the real server boundary together

## Status

Accepted — September 18, 2026.

## Context

The original checkout contained the product and architecture specification but no application, API, schema, or authentication boundary. A polished client without a path to authorization, idempotency, moderation, and deletion propagation would be a static demo, which is not an acceptable launch plan for Heatt.

The reference products provide useful interaction direction: clear content modes, visual cards, strong topic grouping, playful character, and fast navigation. This ADR originally chose a finite default feed; ADR 0003 supersedes that choice for the open-web cold-start surface while keeping community post ranking bounded and privacy-conscious.

## Decision

1. Keep the web app as a React/Vite PWA with local persistence as a graceful development/offline fallback.
2. Add an edge-compatible Hono API under `apps/api`.
3. Authenticate API requests with a forwarded Supabase Auth bearer token; do not use a service-role credential for ordinary traffic.
4. Put relationship, audience, reaction, journal, moderation, idempotency, and deletion invariants in PostgreSQL/RLS in `database/migrations/0001_foundation.sql`.
5. Keep the first online ranking fallback bounded and versioned (`rules-v1`); do not put an LLM or external AI provider on the feed path.
6. Let the client adopt the API incrementally. A provider outage or missing local configuration must not make writing, reading seeded content, or local drafts unusable during development.

## Consequences

### Positive

- There is now a deployable server boundary instead of UI-only permission assumptions.
- One Fire per user/post is enforced by a primary key and intensity constraint.
- Public, follower, room, and private audience combinations are database-enforced.
- Journal content is isolated by RLS and absent from feed queries.
- Post creation, Fire updates, bookmarks, replies, reports, profile updates, and bounded feed reads have concrete request contracts.
- The API remains compatible with Cloudflare Workers because it uses Hono and Supabase's edge-compatible client.

### Tradeoffs

- A real public launch still requires configuring a Supabase project, applying the migration, testing OAuth, and adding moderation/admin workflows.
- Local-first state and server state need a reconciliation layer before multi-device use; the API contracts are the boundary for that work.
- The migration is intentionally foundation-sized. Messaging, circles, Sparks, outbox consumers, and scheduled jobs should be added as separate migrations with permission tests rather than hidden in this first change.

## Rollout and recovery

1. Create a Supabase project and enable the supported OAuth provider.
2. Apply the migration in a disposable project first.
3. Run denied-access tests for blocked users, nonmembers, followers-only posts, journal entries, Fires, and idempotency keys.
4. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a restrictive `CORS_ORIGIN` in the Worker environment.
5. Enable online sync only after Auth and RLS checks pass; retain local draft fallback.
6. Roll back the Worker to the prior version if API errors increase. Do not drop tables as part of the first rollout.
