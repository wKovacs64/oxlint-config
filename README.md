# @wkovacs64/oxlint-config

Personal [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) config.

Native **React hooks** + experimental **`react/react-compiler`**, **type-aware** linting via
`oxlint-tsgolint`, Oxlint defaults, and a few high-signal rule tweaks.

[![npm Version](https://img.shields.io/npm/v/@wkovacs64/oxlint-config.svg?style=for-the-badge)](https://www.npmjs.com/package/@wkovacs64/oxlint-config)
[![Build Status](https://img.shields.io/badge/CI-GitHub%20Actions-success?logo=github&style=for-the-badge)](https://github.com/wKovacs64/oxlint-config/actions?query=workflow%3Aci)

### Install

```sh
pnpm add --save-dev @wkovacs64/oxlint-config oxlint oxlint-tsgolint
```

Requires Node `^20.19.0 || >=22.12.0` (Oxlint JS/TS config needs a TS-capable Node runtime).

### Usage

Create `oxlint.config.ts` in the project root:

```ts
import config from "@wkovacs64/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
});
```

Add scripts:

```json
{
  "scripts": {
    "lint": "oxlint"
  }
}
```

### IDE

VS Code / forks: install [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)
(`oxc.oxc-vscode`).

### Type-aware linting

**On by default** (`options.typeAware: true`). Requires the `oxlint-tsgolint` peer — without it
Oxlint exits with `Failed to find tsgolint executable`.

Type-aware adds analysis cost on large projects. Opt out in the consumer root config:

```ts
import config from "@wkovacs64/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  options: {
    typeAware: false,
  },
});
```

Type-aware rules stay listed when disabled; Oxlint skips them instead of failing the run.

### Customize

```ts
import config from "@wkovacs64/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  ignorePatterns: ["my-generated/**"],
  rules: {
    "react/react-compiler": "warn",
  },
});
```

### Notes

- Prefer Oxlint native plugins/defaults over exhaustive rule dumps.
- `react/react-compiler` is experimental upstream; severity may be overridden per project.
- Setting `plugins` in a consumer config **replaces** the plugin set — include everything you want.
- `no-unused-vars` left on Oxlint defaults (`args: after-used`, built-in `argsIgnorePattern: ^_`
  when the rule is not customized). Not tuning `ignoreRestSiblings` / `varsIgnorePattern`.
- Import **ordering** is not configured (no native `import/order`); use a formatter if you care.
- Not included (no solid native path, or out of scope for v1): Testing Library, jest-dom, Playwright
  recommended sets, Astro, TS naming-convention (e.g. ban `I`-prefix interfaces).
