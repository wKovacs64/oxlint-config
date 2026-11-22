---
"@wkovacs64/oxlint-config": patch
---

Allow extra effect deps by turning off `react/exhaustive-effect-dependencies`. `react/exhaustive-deps` reports missing deps, including in `useInsertionEffect`. If you set its `additionalHooks`, include `useInsertionEffect` in your regex.
