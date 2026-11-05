---
"@wkovacs64/oxlint-config": minor
---

Make every enabled rule an error and add stricter rules: `suspicious` as errors, `no-explicit-any` and `no-unsafe-*`, more type-aware bug catchers, typescript-eslint `stylistic` rules, `ban-ts-comment`, and `reportUnusedDisableDirectives`. Add vendored anti-slop rules, `conventions/require-disable-reason`, `conventions/type-name-casing`, and `module-boundaries/no-parent-imports`. Add a `playwright` feature, auto-detected from `@playwright/test`, enabling `eslint-plugin-playwright`'s recommended rules on Playwright specs. `createConfig` returns `Config`, with every merged key set.
