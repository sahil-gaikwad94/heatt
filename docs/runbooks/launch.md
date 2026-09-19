# Heatt launch runbook

This checklist turns the repository into the capped public beta described in the architecture documents. Do not skip directly to public traffic.

## 1. Create the data project

1. Create a Supabase project.
2. Enable the supported OAuth provider and verify its redirect URL.
3. Apply `database/migrations/0001_foundation.sql`.
4. Apply `database/migrations/0002_profile_relationships.sql`.
5. Apply `database/migrations/0003_delight_layer.sql`.
6. Apply `database/migrations/0004_moderation.sql`.
7. Add the first administrator from the Supabase SQL editor using the commented `admin_users` insert in migration 0004. Never expose administrator writes through the public client.
8. Add three coherent, rights-cleared rooms and a small approved Wisdom library. Every external Wisdom entry must have a completed rights decision; `public_domain_source_pending_review` is not launch-cleared.
9. Confirm that the Auth user trigger creates `profiles` and `user_preferences` rows.

## 2. Run the privacy matrix

Use two authenticated test users, a room member, a nonmember, and an administrator. Verify:

- A public post is visible to an authenticated reader.
- A follower-only post is not visible to a non-follower.
- A room post is not visible to a nonmember.
- A journal entry is visible only to its owner.
- A blocked author's post, reply, and follow context are not visible to the blocker.
- A Fire update creates at most one row for a user/post pair.
- Deleting a post removes it from the feed query.
- An unauthenticated Supabase request cannot read public posts through the REST surface.
- The service-role key is never present in frontend assets or Worker request code.

## 3. Configure the Worker

Set Worker secrets without committing them:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

Set `CORS_ORIGIN` to the deployed Pages origin, not `*`. Deploy from `apps/api` using its `wrangler.toml`.

## 4. Configure the web app

Set:

```bash
VITE_API_URL=https://your-api-worker.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The client keeps local drafts and local fallback behavior when these variables are absent. That fallback is useful for development, but it is not a substitute for applying the migration before public beta.

## 5. Launch gates

Do not admit public users until these are true:

- `npm run check`, `npm run api:check`, and `npm run build` pass.
- OAuth sign-in and refresh have been tested.
- RLS denial tests pass.
- Reporting and administrator review at `/admin` are usable, and a non-admin account receives a 403 from both admin report endpoints.
- Database and asset backups have been restored in a drill.
- Deletion propagation has been verified.
- Feed latency, quota, and error monitoring are in place.
- The Wisdom library has provenance, translator/edition metadata, jurisdiction caveats, and a completed redistribution-rights decision for every published external entry. Research copies remain excluded or visibly marked until then.
- Feed evaluation reports relevance, diversity, novelty, repeat-loop rate, open-web link health, fallback rate, explicit-preference adherence, and bounded-community completion against a deterministic baseline.
- Signups can be paused without corrupting existing writes.
