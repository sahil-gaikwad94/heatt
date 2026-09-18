# ADR 0002: Motion as a non-critical UI layer

- **Status:** Accepted
- **Date:** 2026-09-19
- **Decision:** Use the `motion` React library for short, interruptible route, feed-card, navigation, and atmosphere animations. Keep layout, content, accessibility, and all product behavior functional without JavaScript animation.

## Why

Heatt benefits from a sense of arrival and gentle continuity, but it must not become a high-pressure attention surface. Motion provides declarative, composable transitions without introducing a second rendering framework. The visual layer lives in `src/components/HeattAtmosphere.tsx` and `src/atmosphere.css`; the existing CSS remains the baseline for layout and reduced-motion fallback.

## Guardrails

- `MotionConfig reducedMotion="user"` honors the user's OS preference.
- CSS `prefers-reduced-motion` rules disable decorative loops and shorten transitions.
- No animation is required to discover, post, save, react, tune, or leave a feed.
- Decorative orbit loops are low-contrast and do not create unreadable moving text.
- The library is not used for ranking, analytics, private data, or core API requests.
- The package is MIT-licensed (`motion` 13.4.0 at implementation time) and runs entirely in the client bundle.

## Runtime and maintenance review

The package was installed and verified with TypeScript, Vite production build, the API type check, and the existing content/recommendation contract checks. If the package becomes unmaintained, the component can be reduced to its CSS and semantic markup without changing product behavior.
