# @wkovacs64/oxlint-config

Personal [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) config.

**Type-aware** linting via `oxlint-tsgolint`, Oxlint defaults, high-signal rule tweaks, and
**optional** React / Vitest / Astro layers auto-detected from the package tree (overridable).

[![npm Version](https://img.shields.io/npm/v/@wkovacs64/oxlint-config.svg?style=for-the-badge)](https://www.npmjs.com/package/@wkovacs64/oxlint-config)
[![Build Status](https://img.shields.io/badge/CI-GitHub%20Actions-success?logo=github&style=for-the-badge)](https://github.com/wKovacs64/oxlint-config/actions?query=workflow%3Aci)

### Install

```sh
pnpm add --save-dev @wkovacs64/oxlint-config oxlint oxlint-tsgolint
```

Requires Node `>=24` (Oxlint JS/TS config needs a TS-capable Node runtime).

### Usage

Create `oxlint.config.ts` in the project root:

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig();
```

Use `createConfig` instead of Oxlint's `extends` so root-only settings such as environments and
ignore patterns are applied correctly.

Add scripts:

```json
{
  "scripts": {
    "lint": "oxlint"
  }
}
```

### Feature detection

On load, the config resolves these packages from the consumer install (same idea as the ESLint
config) and enables matching layers:

| Package  | Enables                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `react`  | `react` + `jsx-a11y` plugins/rules; Playwright path hooks exemptions                                                      |
| `vitest` | plugin + `env.vitest` / strict rules on test globs (`no-focused-tests` warn); all `vitest/*` off under `**/playwright/**` |
| `astro`  | `env.astro` + `no-undef` on `**/*.astro` (frontmatter + `<script>` only)                                                  |

Force on/off without relying on resolution (monorepos, tests):

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {},
  {
    react: false,
    vitest: true,
    astro: true,
  },
);
```

### Module boundaries

Module-boundary enforcement is opt-in. Point it at the `#/` alias for the directory containing your
modules:

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {},
  {
    moduleBoundaries: { modulesPath: "#/app/modules" },
  },
);
```

For a module directory named `orders`, its public entrypoints are `orders` and `orders.server`, with
an optional known JavaScript/TypeScript extension. Files outside `app/modules` and files in other
modules must use those aliased public entrypoints. A module may use relative or aliased imports of
its own internals, including nested parent-relative imports. Relative imports and re-exports into a
module are rejected from outside that module. Aliased module paths containing `.` or `..` segments
are always rejected.

The configured directory must exist. The `#/` alias is resolved from the process working directory,
so run Oxlint from the project root. Alias restrictions use Oxlint's native `no-restricted-imports`;
importer-aware relative restrictions are isolated in one JS plugin because Oxlint JS plugins are
alpha.

The boundary applies to static `import` declarations and named/star re-exports with a source. In
Astro files, Oxlint enforces these declarations in frontmatter and `<script>`; Astro template
expressions remain outside Oxlint's linted regions. Dynamic `import()`, `require()`, TypeScript
import-equals, and TypeScript import types are outside its semantic boundary.

### IDE

VS Code / forks: install [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)
(`oxc.oxc-vscode`).

### Type-aware linting

**On by default** (`options.typeAware: true`). Requires the `oxlint-tsgolint` peer — without it
Oxlint exits with `Failed to find tsgolint executable`.

Type-aware adds analysis cost on large projects. Opt out in the consumer root config:

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig({
  options: {
    typeAware: false,
  },
});
```

Type-aware rules stay listed when disabled; Oxlint skips them instead of failing the run.

Type-aware results reflect the project state available when Oxlint runs. If a framework generates
TypeScript declarations or route types, run its type-generation command first. For example, a React
Router project might use:

```json
{
  "scripts": {
    "typegen": "react-router typegen",
    "lint": "pnpm typegen && oxlint",
    "typecheck": "pnpm typegen && tsc"
  }
}
```

### Customize

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig({
  ignorePatterns: ["my-generated/**"],
  rules: {
    "react/react-compiler": "warn",
  },
});
```

Consumer ignore patterns, plugins, and overrides are appended to the shared configuration. Object
settings and rules are merged with consumer values taking precedence.

### Notes

- Prefer Oxlint native plugins/defaults over exhaustive rule dumps.
- `react/react-compiler` is experimental upstream; severity may be overridden per project.
- `createConfig` combines consumer plugins with the shared plugin set.
- `no-unused-vars` left on Oxlint defaults (`args: after-used`, built-in `argsIgnorePattern: ^_`
  when the rule is not customized). Not tuning `ignoreRestSiblings` / `varsIgnorePattern`.
- Import **ordering** is not configured (no native `import/order`); use a formatter if you care.
- **Astro:** Oxlint lints frontmatter + `<script>` only — no template/`client:*` rules (see
  [compatibility](https://oxc.rs/compatibility.html)).
- Not included (no solid native path, or out of scope for v1): Testing Library, jest-dom, Playwright
  recommended sets, TS naming-convention (e.g. ban `I`-prefix interfaces).
