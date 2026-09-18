# Heatt product research notes

This short pass informed the first product surface in the repository. It is not a claim that Heatt is superior to any platform; it is a record of the product patterns we chose to adapt and the ones we deliberately rejected.

## Patterns worth carrying forward

- **Topic + writer + publication discovery:** Medium's recommendation guidance explicitly groups following around topics, writers, and publications, and also exposes reading history and muted sources. Heatt maps this to selected topics, rooms, follows, saved thoughts, and a visible Feed Tuner rather than a black-box “for you” feed.
- **Text selection as an action:** Medium-style highlighting and response patterns make reading more participatory. Heatt's private journal and reflection flow are designed around saving a thought or writing one sentence, not around extracting private notes into ranking signals.
- **A clear editorial taxonomy:** HBR's official topic index is broad but legible: Managing Yourself, Leadership, Innovation, Technology and Analytics, Managing People, Strategy, Organizational Culture, Communication, Economics, Decision Making, and Career Planning are useful parent areas. Heatt's selectable topics use narrower, friendlier labels such as Strategy & decisions, Innovation & technology, Work & careers, Culture & society, Health & attention, and Books & ideas.
- **Microblogging essentials:** Short posts, replies, topic labels, follows, custom feed views, bookmarks, and community spaces are table stakes. Heatt keeps visible “why this appeared” explanations and one reaction per person. ADR 0003 adds a continuously loading, category-organized open-web feed for cold start while real Following and Rooms views remain bounded.
- **User-controlled feeds:** Contemporary text networks increasingly expose custom or selectable feed experiences. Heatt keeps three understandable modes—For You, Following, Rooms—and makes tuning explicit rather than asking people to reverse-engineer an algorithm.

## Heatt-specific decisions

1. **Worthwhile sessions, not maximum session length.** A feed ends after a bounded batch and says why. Discovery Roulette is a deliberate next action, not autoplay.
2. **Interest signals are hierarchical.** Explicit topics and session intent lead; follows and room membership are next; saves and Fires are bounded evidence; dwell is not a primary objective.
3. **Quality is exposure-aware.** Seeded data demonstrates the product and `src/lib/recommendation.ts` is intentionally small, deterministic, and interpretable. A production API will need impression-level events, smoothing, safety gates, and time-split evaluation before any learned ranking.
4. **People need context.** Post type, invitation (“Advice welcome”, “Just sharing”, “Questions welcome”), room, source, and “Why this?” are first-class display elements.
5. **Privacy is a product feature.** Journal content is shown as private by construction, share cards are rendered locally, and nothing in the client-side preference model reads the journal to rank public content.
6. **Character without synthetic activity.** Kindle is a small editorial guide character that reacts to an explicit tap. It is not a fake user, does not publish, and does not pretend to be human.

## Sources

- Medium Help — [Refine recommendations](https://help.medium.com/hc/en-us/articles/224488047-Refine-recommendations)
- HBR — [All Topics](https://hbr.org/topics)
- HBR Store — [10 Must Reads on Technology and Strategy](https://store.hbr.org/product/hbr-s-10-must-reads-on-technology-and-strategy-collection-7-books/10432)
- Product Hunt — [Microblogging category](https://www.producthunt.com/categories/microblogging)

## Scope note

The repository started with product and architecture documents but no client, API, database, authentication, or migration code. The current slice therefore implements the complete text-first client experience with local persistence and no external provider requirement. Local persistence is useful for product evaluation and keeps the core usable offline; a production rollout still needs the Supabase Auth/PostgreSQL/RLS boundary described in `ARCHITECTURE_AND_ENGINEERING.md` before real public beta admission.
