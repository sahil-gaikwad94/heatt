# Heatt feed, recommendation, and content quality notes

This document records the launch-safe decisions behind the open-web cold-start feed, local recommendation module, and Wisdom content register. It is an implementation and review aid, not a claim that this is an exhaustive or objectively “best” list.

## Open-web cold-start feed

Heatt has no reason to pretend that an empty network is already busy. The default state therefore contains no fabricated members, public posts, replies, reactions, or popularity counters. The **For You** surface starts with a reviewed directory of original publishers in `src/data/blogCatalog.ts`.

The launch catalog contains 53 sources across the same 13 explicit topic categories used by feed preferences. Cards include only:

- source and domain;
- canonical HTTPS destination;
- topic category and discovery tags;
- a broad publisher-type label;
- an original Heatt editorial description.

Heatt does not ingest or reproduce article bodies, publisher images, RSS excerpts, bylines, or publication metrics. “Visit blog” always opens the original website. “Free to read” means that the destination offered substantial material without a required paid subscription when reviewed on September 18, 2026; it does not promise that every item on a third-party site is free forever. Publishers may offer optional paid products. External availability needs periodic editorial review.

The unfiltered feed begins with eight cards. An `IntersectionObserver` watches a labelled sentinel and appends six more before the reader reaches it. Once every unique source has appeared, another deterministic pass begins with a visible **Fresh reading loop** label. Search and category-filtered shelves do not loop: they end after all matching sources are visible. This keeps the primary feed mechanically continuous without hiding the limits of the curated catalog.

## Deterministic community recommendation contract

`src/lib/recommendation.ts` still ranks bounded pages for real community posts in **Following** and **Rooms**. The order is intentionally understandable:

1. explicit topic choices;
2. style fit, followed voices, and joined rooms;
3. bounded saved/practice continuity;
4. freshness and a small, opt-in new-voice exploration term;
5. a diversity re-rank with author, topic, and adjacent-type penalties.

Items explicitly excluded by the preference state are removed. Recently seen items receive a fatigue penalty, and fresh candidates are preferred when enough exist. An item not shown is unknown, never a negative preference. No raw popularity or private Journal signal is used. The ranker returns a finite page even though the separate open-web discovery surface appends catalog batches continuously.

Every community result has a reason code suitable for “Why this appeared”:

- `chosen_topic`
- `followed_voice`
- `followed_path`
- `practice_continuity`
- `recently_saved`
- `new_angle`
- `broadened_after_no_match`

`npm run test:recommendations` checks determinism, bounded output, exclusions, explicit-topic reasoning, relationship reasons, author fatigue, fresh-over-seen ordering, and the no-match fallback label. This is a small contract test, not a substitute for time-split evaluation on real consented data.

`npm run test:blogs` checks catalog size, category coverage, uniqueness, HTTPS destinations, description boundaries, publisher labels, and discovery tags. `npm run test:e2e` checks cold-start rendering, external-link behavior, local saves, automatic append, category filtering, search, honest empty community states, and desktop/mobile navigation.

## Fallback ladder

When the community API is unavailable or the active community path has no candidates, the product follows this order:

1. an honest Following/Rooms empty state;
2. a direct action back to the reviewed open-web directory;
3. ranked cached community candidates only when they are identified as stale;
4. local rights-reviewed/original Wisdom where that surface calls for it;
5. retry/offline messaging without invented people or activity.

No fallback may expose Journal/private content. The Wisdom selector maps explicit topics to Gita, Stoic, Poetry, Creator, and Blend paths before choosing a deterministic item; it does not use a generic day-based random pick. If an external Wisdom record is removed during rights review, the fallback should prefer an original Heatt reflection that names the theme without impersonating the source.

## Evaluation hooks

A feed change is not “better” because a single engagement number moved. Evaluation should report:

- open-web link success, catalog freshness, and category coverage;
- unique-source coverage before the first repeated reading loop;
- append latency and duplicate ordering across loops;
- relevance: nDCG@k or Recall@k against explicit saves, follows, and voluntary practice starts;
- explicit-preference adherence;
- source/author/topic concentration and intra-page diversity;
- novelty and repeat rate, including recently seen repeats;
- fallback, stale-cache, and no-match rates;
- reason-code distribution and explanation validity;
- privacy, safety, exclusion, and quota error rates.

Treat impressions as exposure—not as a preference. Account for position and availability, and remember that an unshown item was never tested. Compare recommendation work against a deterministic baseline and pre-register the evaluation window and guardrails before reading results. Never publish superiority claims without an appropriate, reproducible study.

## Research basis

The original recommendation research remains useful for community ranking:

- ACM survey: [Recommender Systems: A Survey](https://dl.acm.org/doi/10.1145/3564284) — exposure/popularity bias, feedback loops, unknown-not-negative handling, fairness, and diversity.
- Cold-start and diversity review: [A survey of recommender systems](https://link.springer.com/article/10.1007/s41060-023-00418-4) — content-based cold start, hybrid systems, and multi-metric evaluation.
- New-item fairness: [Fairness among new items in recommender systems](https://people.engr.tamu.edu/caverlee/pubs/Ziwei_SIGIR_2021.pdf) — avoid popularity-only exposure for new and long-tail items.
- Exposure-aware ranking: [Exposure-aware online ranking](https://arxiv.org/html/2408.04332v1) — position-aware exposure accounting and limits of naive exploration.

These sources support evaluation choices; they do not prove that Heatt’s current catalog or ranking performs well.
