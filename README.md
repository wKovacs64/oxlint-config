# @wkovacs64/oxlint-config

Personal [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) config.

Native **React hooks** + experimental **`react/react-compiler`**, plus Oxlint defaults with a few
high-signal tweaks ported from
[`@wkovacs64/eslint-config`](https://github.com/wKovacs64/eslint-config).

[![npm Version](https://img.shields.io/npm/v/@wkovacs64/oxlint-config.svg?style=for-the-badge)](https://www.npmjs.com/package/@wkovacs64/oxlint-config)
[![Build Status](https://img.shields.io/badge/CI-GitHub%20Actions-success?logo=github&style=for-the-badge)](https://github.com/wKovacs64/oxlint-config/actions?query=workflow%3Aci)

### Install

```sh
pnpm add --save-dev @wkovacs64/oxlint-config oxlint
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

### Type-aware linting (optional)

Not enabled here (`options.typeAware` is root-config-only). In the app config:

```ts
import config from "@wkovacs64/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  options: {
    typeAware: true,
  },
});
```

Also install [`oxlint-tsgolint`](https://www.npmjs.com/package/oxlint-tsgolint).

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

- Prefer Oxlint native plugins/defaults over 1:1 ESLint parity.
- `react/react-compiler` is experimental upstream; severity may be overridden per project.
- Setting `plugins` in a consumer config **replaces** the plugin set — include everything you want.
