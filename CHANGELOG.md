# @wkovacs64/oxlint-config

## 0.5.0

### Minor Changes

- [#29](https://github.com/wKovacs64/oxlint-config/pull/29) [`ee9f880`](https://github.com/wKovacs64/oxlint-config/commit/ee9f880ecc393e6c33cbeeb5262b2ed14b4438d2) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Replace the `jsxA11y` feature with `remix`, auto-detected from `remix/component`. Remix enables JSX bug checks and accessibility rules without React-only rules. Remove `jsxA11y` from feature options; use `remix: true` for Remix 3 JSX. `typescript/no-floating-promises` now allows Remix `handle.update()` calls.

- [#31](https://github.com/wKovacs64/oxlint-config/pull/31) [`adb9aa7`](https://github.com/wKovacs64/oxlint-config/commit/adb9aa73feb575a10a957648cd7543505570c5f4) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Make every enabled rule an error and add stricter rules: `suspicious` as errors, `no-explicit-any` and `no-unsafe-*`, more type-aware bug catchers, typescript-eslint `stylistic` rules, `ban-ts-comment`, and `reportUnusedDisableDirectives`. Add vendored anti-slop rules, `conventions/require-disable-reason`, `conventions/type-name-casing`, and `module-boundaries/no-parent-imports`. Add a `playwright` feature, auto-detected from `@playwright/test`, enabling `eslint-plugin-playwright`'s recommended rules on Playwright specs. `createConfig` returns `Config`, with every merged key set.

## 0.4.0

### Minor Changes

- [#26](https://github.com/wKovacs64/oxlint-config/pull/26) [`1544783`](https://github.com/wKovacs64/oxlint-config/commit/154478326fce212152ecc5336bbed89a6c83b078) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Reject typographic quotes in string literals, JSX text, and template text by default. Comments are excluded.

## 0.3.0

### Minor Changes

- [#24](https://github.com/wKovacs64/oxlint-config/pull/24) [`9e871dc`](https://github.com/wKovacs64/oxlint-config/commit/9e871dc09dcb5a898af2d05c7d8116feb240f354) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Add a `jsxA11y` feature option to enable or disable shared JSX accessibility checks independently of React. Accessibility continues to follow the React feature by default.

## 0.2.2

### Patch Changes

- [#19](https://github.com/wKovacs64/oxlint-config/pull/19) [`9e84704`](https://github.com/wKovacs64/oxlint-config/commit/9e84704ac545597fdff1be0f99f31ab4e1d84b46) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Allow bare `_` for unused parameters.

## 0.2.1

### Patch Changes

- [#16](https://github.com/wKovacs64/oxlint-config/pull/16) [`73c2901`](https://github.com/wKovacs64/oxlint-config/commit/73c2901c51b413ce0ddf580563e4013e0f39ba3f) Thanks [@wKovacs64](https://github.com/wKovacs64)! - Require Oxlint 1.79 for React Compiler rules.

## 0.2.0

### Minor Changes

- [#14](https://github.com/wKovacs64/oxlint-config/pull/14) [`b6126ab`](https://github.com/wKovacs64/oxlint-config/commit/b6126ab5f052e79f378681c72835349b96784e0c) Thanks [@renovate](https://github.com/apps/renovate)! - Support Oxlint 1.79's split React Compiler rules.
