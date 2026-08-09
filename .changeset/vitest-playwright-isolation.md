---
"@wkovacs64/oxlint-config": patch
---

Disable all native `vitest/*` rules under `**/playwright/**` when Vitest is enabled so category-activated Vitest correctness no longer leaks into Playwright paths.
