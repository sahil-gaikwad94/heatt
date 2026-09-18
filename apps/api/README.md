# Heatt API

Edge-compatible Hono API for the Heatt web client.

## Routes currently implemented

- `GET /health`
- `GET /v1/me/profile`
- `PATCH /v1/me/profile`
- `GET /v1/feed?mode=for-you|following|rooms`
- `POST /v1/posts`
- `PUT /v1/posts/:id/fire`
- `PUT /v1/posts/:id/bookmark`
- `POST /v1/posts/:id/replies`
- `POST /v1/reports`
- `GET/PATCH /v1/preferences`
- `GET/POST/DELETE /v1/journal`
- `GET/POST /v1/rooms`
- `PUT /v1/rooms/:id/membership`
- `GET /v1/wisdom/today`
- `POST/DELETE /v1/replies/:id/helpful`
- `GET /v1/journeys`
- `PUT /v1/journeys/:id/enrollment`
- `POST /v1/journeys/:id/advance`
- `GET/POST/DELETE /v1/time-capsules`

All `/v1` routes require a Supabase Auth bearer token. The Worker creates a Supabase client with that user token, so ordinary requests remain subject to PostgreSQL RLS. No service-role credential is used in request handling.

## Local type-check

From the repository root:

```bash
npm run api:check
```

## Cloudflare deployment

The Worker configuration is in `wrangler.toml`. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as secrets, and keep `CORS_ORIGIN` restricted to the deployed web origin. Apply `database/migrations/0001_foundation.sql`, `0002_profile_relationships.sql`, and `0003_delight_layer.sql` to a disposable Supabase project first, then run the authorization test matrix before enabling the online client.

The API is deliberately thin: Postgres owns relationships, access, unique Fire reactions, and private data boundaries; the Worker validates requests, forwards the caller identity, ranks a bounded public candidate set, and returns compact responses.
