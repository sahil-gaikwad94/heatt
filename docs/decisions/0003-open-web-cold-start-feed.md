# ADR 0003: Infinite open-web cold-start feed

- **Status:** Accepted
- **Date:** 2026-09-18
- **Supersedes:** The finite stopping point for the default For You surface in ADR 0001; bounded community ranking remains unchanged.

## Context

Heatt does not yet have enough real public members or posts to populate a useful social feed. Presenting fictional profiles, reactions, comments, or member counts would violate the product’s trust rules. A hard stopping point after a handful of empty-network posts also does not meet the current product direction: the primary discovery experience should load continuously in the familiar pattern used by large feed products.

Republishing external articles or relying on client-side RSS requests would introduce rights, provenance, CORS, availability, and operational problems. A zero-spend beta also cannot depend on a paid aggregation service.

## Decision

The default For You experience is a static, editorially reviewed directory of original publishers:

- 53 free-reading destinations across 13 categories;
- canonical outbound HTTPS links;
- original Heatt descriptions, publisher-type labels, and discovery tags;
- no copied article bodies, excerpts, images, bylines, feeds, or popularity data;
- eight initial cards and six-card append batches driven by `IntersectionObserver`;
- continuous deterministic reading loops only in the unfiltered All view, visibly labelled after the unique catalog is exhausted;
- finite, honest endings for search results and category-filtered shelves;
- local-only source bookmarks in the unauthenticated beta.

The Following and Rooms surfaces retain the deterministic bounded post ranker. They start empty and show only authenticated API posts or content created by the current user.

## Consequences

### Positive

- Heatt is useful before network effects without pretending members exist.
- Every reading action preserves attribution and publisher traffic.
- The primary feed has automatic, continuous loading with no paid runtime dependency.
- Explicit category controls keep the large directory understandable.
- The implementation is deterministic, accessible, and testable offline.

### Costs and limitations

- A reviewed catalog can never literally contain every worthwhile blog.
- External destinations and free-access policies can change, so links need periodic editorial review.
- The unfiltered feed eventually repeats sources; the repeat is disclosed rather than hidden.
- Static source cards are not a substitute for current article-level aggregation.
- Source bookmarks are not synchronized until a dedicated, authorized API contract exists.

## Verification

- `npm run test:blogs` validates catalog structure and coverage.
- `npm run test:e2e` validates first render, outbound links, local saves, automatic append, filters, search, empty community states, and desktop/mobile layouts.
- Manual screenshots are generated from the running UI, not from design mockups.
