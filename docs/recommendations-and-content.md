# Heatt recommendation and Wisdom quality notes

This document records the launch-safe decisions behind the local recommendation module and the Wisdom content register. It is an implementation and review aid, not a superiority claim.

## Deterministic recommendation contract

`src/lib/recommendation.ts` ranks a finite page with a deterministic function. The order is intentionally understandable:

1. explicit topic choices;
2. style fit, followed voices, and joined rooms;
3. bounded saved/practice continuity;
4. freshness and a small, opt-in new-voice exploration term;
5. a diversity re-rank with author, topic, and adjacent-type penalties.

Items explicitly excluded by the preference state are removed. Recently seen items receive a fatigue penalty, and fresh candidates are preferred when enough exist. An item not shown is unknown, never a negative preference. No raw popularity or private Journal signal is used. The page is capped and the UI presents a stopping point.

Every result has a reason code suitable for “Why this appeared”:

- `chosen_topic`
- `followed_voice`
- `followed_path`
- `practice_continuity`
- `recently_saved`
- `new_angle`
- `broadened_after_no_match`

`npm run test:recommendations` checks determinism, finite output, exclusions, explicit-topic reasoning, relationship reasons, author fatigue, fresh-over-seen ordering, and the no-match fallback label. This is a small contract test, not a substitute for time-split evaluation on real consented data.

## Fallback ladder

When the online source is unavailable or the active path has no candidates, the product should follow this order:

1. ranked online candidates matching the active mode and explicit preferences;
2. cached candidates with a visible stale-data label;
3. local rights-reviewed or original Heatt candidates matching path/topic;
4. broader local candidates with `broadened_after_no_match` and a plain-language explanation;
5. one small original Heatt reflection plus retry/offline messaging.

No fallback should invent a user, pretend that a quote is historical, or expose Journal/private content. The Wisdom selector maps explicit topics to Gita, Stoic, Poetry, Creator, and Blend paths before choosing a deterministic item; it does not use a generic day-based random pick. If an external Wisdom record is removed during rights review, the fallback should prefer an original Heatt reflection that names the theme without impersonating the source.

## Evaluation hooks

A recommendation change is not “better” because a single engagement number moved. A controlled, time-split evaluation should report:

- relevance: nDCG@k or Recall@k against explicit saves, follows, and voluntary practice starts;
- explicit-preference adherence;
- author/topic/tradition concentration and intra-page diversity;
- long-tail and new-item coverage;
- novelty and repeat rate, including recently seen repeats;
- fallback rate, stale-cache rate, and no-match rate;
- reason-code distribution and explanation validity;
- finite-feed stopping-point completion and return-without-pressure signals;
- privacy, safety, exclusion, and quota error rates.

Treat impressions as exposure—not as a preference. Account for position, availability, and the fact that an unshown item was never tested. Compare against a deterministic baseline and pre-register the evaluation window and guardrails before reading results. Never publish “better than Google” or similar claims without an appropriate, reproducible study.

## Research basis

The research pass used the following sources as design context:

- ACM survey: [Recommender Systems: A Survey](https://dl.acm.org/doi/10.1145/3564284) — exposure/popularity bias, feedback loops, unknown-not-negative handling, fairness, and diversity.
- Cold-start and diversity review: [A survey of recommender systems](https://link.springer.com/article/10.1007/s41060-023-00418-4) — content-based cold start, hybrid systems, and multi-metric evaluation.
- New-item fairness: [Fairness among new items in recommender systems](https://people.engr.tamu.edu/caverlee/pubs/Ziwei_SIGIR_2021.pdf) — avoid popularity-only exposure for new and long-tail items.
- Exposure-aware ranking: [Exposure-aware online ranking](https://arxiv.org/html/2408.04332v1) — position-aware exposure accounting and limits of naive exploration.

These sources support evaluation choices; they do not prove that Heatt's current small catalog performs well.
