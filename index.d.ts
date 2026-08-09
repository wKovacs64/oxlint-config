import type { OxlintConfig } from "oxlint";

export type ConfigOptions = Omit<OxlintConfig, "extends">;

export type Features = {
  /** React + jsx-a11y plugins/rules and Playwright hooks exemptions. Default: auto-detect `react`. */
  react?: boolean;
  /** Vitest plugin + focused-test warning on test globs. Default: auto-detect `vitest`. */
  vitest?: boolean;
  /** `env.astro` + `no-undef` on Astro files (frontmatter/script only). Default: auto-detect `astro`. */
  astro?: boolean;
};

export declare function createConfig(config?: ConfigOptions, features?: Features): OxlintConfig;
