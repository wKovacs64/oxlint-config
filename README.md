# @wkovacs64/oxlint-config

Personal [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) config.

**Type-aware** linting via `oxlint-tsgolint`, strict bug-catching and consistency rules,
[anti-slop](#anti-slop), and **optional** React / Remix / Vitest / Playwright / Astro layers
auto-detected from the package tree (overridable). Every enabled rule is an error: warnings don't
fail CI, so they get ignored.

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

| Package            | Enables                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `react`            | `react` + `jsx-a11y` plugins/rules; all `react/*` off under `**/playwright/**`                  |
| `remix`            | JSX + `jsx-a11y` rules without React-only rules (via `remix/component`)                         |
| `vitest`           | plugin + `env.vitest` / strict rules on test globs; all `vitest/*` off under `**/playwright/**` |
| `@playwright/test` | `eslint-plugin-playwright`'s recommended rules, as errors, on `**/playwright/**/*.spec.*`       |
| `astro`            | `env.astro` + `no-undef` on `**/*.astro` (frontmatter + `<script>` only)                        |

Force on/off without relying on resolution (monorepos, tests):

```ts
import { createConfig } from "@wkovacs64/oxlint-config";

export default createConfig(
  {},
  {
    react: false,
    remix: true,
    vitest: true,
    playwright: true,
    astro: true,
  },
);
```

`remix` is for Remix 3 apps, which render JSX through `remix/component` instead of React. It enables
the `react` plugin with every `react/*` rule off except the JSX checks that apply to any JSX
rendering HTML (`jsx-key`, `jsx-no-duplicate-props`, `jsx-no-undef`, `jsx-props-no-spread-multi`,
`void-dom-elements-no-children`, `iframe-missing-sandbox`, `jsx-no-comment-textnodes`,
`jsx-no-script-url`), plus the `jsx-a11y` plugin and shared rules. React-only rules such as hooks,
React Compiler, `no-unknown-property`, and `display-name` stay off: Remix uses `class`, `mix`, and
`innerHTML`, and its components are setup functions returning render functions. With both `react`
and `remix`, the React layer applies.

`typescript/no-floating-promises` allows Remix's `handle.update()` without `await` or `void`
([Remix docs](https://docs.remix.run/rendering-ui/) call it that way in event handlers).

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

Outside the modules directory, static imports and re-exports may not climb with `../`
(`module-boundaries/no-parent-imports`); use a `#/` alias. `./` imports and dynamic `import()` are
allowed, since `#/` aliases do not resolve in dynamic imports.

```ts
// app/routes/admin/users.tsx
import { helper } from "./helper"; // ok
import { db } from "#/app/utils/db"; // ok
import { db } from "../../utils/db"; // error
const lazy = await import("../../utils/db"); // ok
```

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
    "no-debugger": "warn",
  },
});
```

Consumer ignore patterns, plugins, and overrides are appended to the shared configuration. Object
settings and rules are merged with consumer values taking precedence.

### What it checks

- Oxlint's `correctness` and `suspicious` categories, as errors
- Bug catchers from other categories, including type-aware `no-misused-promises`,
  `switch-exhaustiveness-check`, `no-deprecated`, `only-throw-error`,
  `prefer-promise-reject-errors`, `return-await`, `prefer-nullish-coalescing`,
  `strict-boolean-expressions`, and `restrict-plus-operands`
- `no-explicit-any` plus the `no-unsafe-*` rules, which stop the `any` from `JSON.parse`,
  `Response.json()`, and untyped packages from spreading. `no-unsafe-assignment` and
  `unbound-method` are off in `**/tests/**`, `**/#tests/**`, `**/__tests__/**`, and `**/*.test.*`
  (not Playwright specs), where asymmetric matchers (`expect.any(String)`) are `any` and
  `expect(service.save)` references methods
- typescript-eslint's `stylistic` preset rules and `unified-signatures`, without
  `consistent-type-definitions`
- `eqeqeq`, `import/no-duplicates`, `consistent-type-assertions`, `method-signature-style: property`
- [anti-slop](#anti-slop) and the [custom rules](#custom-rules)
- Source files may not import test files

`as` and `!` are allowed; an `as` needs a `SAFETY:` comment. `@ts-ignore` and `@ts-nocheck` are
banned; `@ts-expect-error` needs a description.

Strings may be tested for truthiness and defaulted with `||`: `if (!str)` and `str || "default"`
treat `""` as missing. Numbers may not: `{count && <Badge />}` renders `0`. Enable
`noUncheckedIndexedAccess` in `tsconfig.json`, or `strict-boolean-expressions` reports
`if (!items[i])` as always truthy.

### Disable directives

Disable one rule, and say why after `--`:

```ts
// oxlint-disable-next-line typescript/no-deprecated -- no replacement until the v3 SDK
```

`conventions/require-disable-reason` reports a directive without a reason,
`unicorn/no-abusive-eslint-disable` one without a rule name, and `reportUnusedDisableDirectives` one
that suppresses nothing.

### Custom rules

| Rule                                 | Reports                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `typography/no-typographic-quotes`   | U+2018, U+2019, U+201C, and U+201D in strings, JSX text, and template text (not comments)          |
| `conventions/require-disable-reason` | `eslint-disable` and `oxlint-disable` directives without a `-- reason`                             |
| `conventions/type-name-casing`       | Type, interface, class, enum, and type parameter names that aren't PascalCase or use an `I` prefix |
| `module-boundaries/*`                | [Module boundaries](#module-boundaries), when enabled                                              |

### anti-slop

Every generic rule from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), plus
`oxc/no-accumulating-spread`. They reject unexplained type assertions, ad hoc `typeof` narrowing,
`unknown` and dictionary types past the I/O boundary, object parameters, module mocking, and dense
code without blank lines between statements.

- Parse external input at its boundary and pass the parsed type on. `typeof` is allowed in
  TypeScript type guards (functions returning `value is T`).
- A type assertion needs a `SAFETY:` comment stating the invariant that makes it true.
- Tests replace dependencies through real interfaces instead of `vi.mock`.

`anti-slop/require-readable-spacing` is autofixable with `oxlint --fix`. The rules are vendored as
JavaScript in `plugins/anti-slop` by `scripts/vendor-anti-slop.mjs` (Effect rules excluded). To
update, run it with an upstream commit SHA:

```sh
node scripts/vendor-anti-slop.mjs <sha>
```

### Notes

- `createConfig` combines consumer plugins with the shared plugin set.
- `no-unused-vars` allows unused arguments prefixed with `_`, including bare `_`, and rest siblings.
- `typescript/no-floating-promises` allows `node:test`'s `test`/`it`/`describe`/`suite` and Remix's
  `handle.update()` unawaited.
- `typescript/only-throw-error` allows throwing `Response` and React Router's `data()`.
- Import **ordering** is not configured (no native `import/order`); use a formatter if you care.
- **Astro:** Oxlint lints frontmatter + `<script>` only — no template/`client:*` rules (see
  [compatibility](https://oxc.rs/compatibility.html)).
- Not included: Testing Library and jest-dom.
