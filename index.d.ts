import type { OxlintConfig } from "oxlint";

export type ConfigOptions = Omit<OxlintConfig, "extends">;

export declare function createConfig(config?: ConfigOptions): OxlintConfig;
