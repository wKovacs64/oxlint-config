---
"@wkovacs64/oxlint-config": minor
---

Replace the `jsxA11y` feature with `remix`, auto-detected from `remix/component`. Remix enables JSX bug checks and accessibility rules without React-only rules. Remove `jsxA11y` from feature options; use `remix: true` for Remix 3 JSX. `typescript/no-floating-promises` now allows Remix `handle.update()` calls.
