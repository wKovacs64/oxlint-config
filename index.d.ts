import type { OxlintConfig } from "oxlint";

export type ConfigOptions = Omit<OxlintConfig, "extends">;

/** The keys `createConfig` always sets. */
type BaseKey =
  | "plugins"
  | "jsPlugins"
  | "categories"
  | "env"
  | "globals"
  | "ignorePatterns"
  | "options"
  | "rules"
  | "overrides"
  | "settings";

export type Config = OxlintConfig & { [Key in BaseKey]-?: NonNullable<OxlintConfig[Key]> };

export type ModuleBoundaries = {
  /** `#/` alias for the directory containing module directories. */
  modulesPath: string;
};

export type Features = {
  /** React plugin/rules, JSX and accessibility rules, and Playwright React exemptions. Default: auto-detect `react`. */
  react?: boolean;
  /** JSX and accessibility rules without React-only rules. Default: auto-detect `remix/component`. */
  remix?: boolean;
  /** Vitest plugin and rules on test globs. Default: auto-detect `vitest`. */
  vitest?: boolean;
  /** eslint-plugin-playwright's recommended rules on Playwright specs. Default: auto-detect `@playwright/test`. */
  playwright?: boolean;
  /** `env.astro` + `no-undef` on Astro files (frontmatter/script only). Default: auto-detect `astro`. */
  astro?: boolean;
  /** Enforce public module entrypoints and `#/` aliases over `../`. Disabled by default. */
  moduleBoundaries?: ModuleBoundaries;
};

export declare function createConfig(config?: ConfigOptions, features?: Features): Config;
