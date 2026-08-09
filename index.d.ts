import type { OxlintConfig } from "oxlint";

export type ConfigOptions = Omit<OxlintConfig, "extends">;

export type ModuleBoundaries = {
  /** `#/` alias for the directory containing module directories. */
  modulesPath: string;
};

export type Features = {
  /** React + jsx-a11y plugins/rules and Playwright hooks exemptions. Default: auto-detect `react`. */
  react?: boolean;
  /** Vitest plugin + focused-test warning on test globs. Default: auto-detect `vitest`. */
  vitest?: boolean;
  /** `env.astro` + `no-undef` on Astro files (frontmatter/script only). Default: auto-detect `astro`. */
  astro?: boolean;
  /** Enforce public module entrypoints. Disabled by default. */
  moduleBoundaries?: ModuleBoundaries;
};

export declare function createConfig(config?: ConfigOptions, features?: Features): OxlintConfig;
