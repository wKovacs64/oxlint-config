import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

const vitestGlobs = ["**/__tests__/**/*", "**/*.test.*"];
const testGlobs = ["**/tests/**", "**/#tests/**", ...vitestGlobs];
const playwrightGlobs = ["**/playwright/**"];
const playwrightTestGlobs = ["**/playwright/**/*.spec.*"];

/**
 * @param {string} pkgName
 */
function has(pkgName) {
  try {
    import.meta.resolve(pkgName, import.meta.url);
    return true;
  } catch {
    return false;
  }
}

/** @type {Record<string, "off"> | undefined} */
let cachedVitestRuleOffs;

/**
 * Every native `vitest/*` rule key from the installed oxlint schema.
 * Category-enabled Vitest rules activate globally with the plugin; Playwright
 * paths need an explicit off list (override `excludeFiles` only drops env/severity).
 * @returns {Record<string, "off">}
 */
function vitestRuleOffs() {
  if (cachedVitestRuleOffs) {
    return cachedVitestRuleOffs;
  }
  const oxlintPkg = fileURLToPath(import.meta.resolve("oxlint/package.json"));
  const schema = readFileSync(join(dirname(oxlintPkg), "configuration_schema.json"), "utf8");
  const keys = new Set([...schema.matchAll(/"(vitest\/[^"]+)"/g)].map((match) => match[1]));
  if (keys.size === 0) {
    throw new Error("oxlint configuration_schema.json: no vitest/* rules found");
  }
  /** @type {Record<string, "off">} */
  const offs = {};
  for (const key of keys) {
    offs[key] = "off";
  }
  cachedVitestRuleOffs = offs;
  return offs;
}

/**
 * @typedef {{ react?: boolean, vitest?: boolean, astro?: boolean }} Features
 */

/**
 * @param {Features} [features]
 */
function resolveFeatures(features = {}) {
  return {
    react: features.react ?? has("react"),
    vitest: features.vitest ?? has("vitest"),
    astro: features.astro ?? has("astro"),
  };
}

/**
 * @param {Features} [featureFlags]
 */
function buildBaseConfig(featureFlags) {
  const { react: hasReact, vitest: hasVitest, astro: hasAstro } = resolveFeatures(featureFlags);

  /** @type {string[]} */
  const plugins = ["eslint", "typescript", "unicorn", "oxc", "import"];
  if (hasReact) {
    plugins.push("react", "jsx-a11y");
  }
  if (hasVitest) {
    plugins.push("vitest");
  }

  /** @type {Record<string, unknown>} */
  const rules = {
    "import/no-duplicates": ["warn", { preferInline: true }],
    "import/no-unassigned-import": "off",

    // High-signal TS tweaks; prefer Oxlint defaults otherwise
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-floating-promises": ["error", { ignoreIIFE: true }],
    "typescript/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/unbound-method": "off",
    "typescript/ban-ts-comment": "off",
    "typescript/consistent-type-definitions": "off",
  };

  if (hasReact) {
    Object.assign(rules, {
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
      "react/react-compiler": "error",
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",
          unnamedComponents: "arrow-function",
        },
      ],
      "react/react-in-jsx-scope": "off",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          assert: "either",
        },
      ],
      "jsx-a11y/prefer-tag-over-role": "off",
    });
  }

  /** @type {import("oxlint").OxlintConfig["overrides"]} */
  const overrides = [
    {
      // Source files must not import test files
      files: ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
      excludeFiles: [...testGlobs, ...playwrightGlobs],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "**/tests/**",
                  "**/#tests/**",
                  "**/__tests__/**",
                  // bare + extensioned (e.g. ./foo.test, ./foo.test.ts)
                  "**/*.test",
                  "**/*.test.*",
                  "**/*.spec",
                  "**/*.spec.*",
                ],
                message: "Do not import test files in source files",
              },
            ],
          },
        ],
      },
    },
  ];

  if (hasVitest) {
    overrides.push({
      files: testGlobs,
      excludeFiles: playwrightTestGlobs,
      env: {
        vitest: true,
      },
      rules: {
        "vitest/no-focused-tests": "warn",
      },
    });
    // Categories enable vitest/* globally once the plugin is on; turn them all
    // off under Playwright paths (excludeFiles on the Vitest override is not enough).
    overrides.push({
      files: playwrightGlobs,
      rules: vitestRuleOffs(),
    });
  }

  if (hasReact) {
    overrides.push({
      // Playwright specs aren't React components/hooks consumers
      files: playwrightGlobs,
      rules: {
        "react/rules-of-hooks": "off",
        "react/exhaustive-deps": "off",
        "react/react-compiler": "off",
      },
    });
  }

  if (hasAstro) {
    overrides.push({
      // Oxlint lints .astro frontmatter + <script> only (no template rules).
      files: ["**/*.astro"],
      env: {
        astro: true,
      },
      rules: {
        // Make Astro globals meaningful; TS handles most .ts undef cases.
        "no-undef": "error",
      },
    });
  }

  return defineConfig({
    // Setting `plugins` replaces defaults — include the full desired set.
    plugins,
    options: {
      // Requires peer `oxlint-tsgolint`. Consumers may set `typeAware: false` to opt out.
      typeAware: true,
    },
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      "**/.astro/**",
      "**/.cache/**",
      "**/.react-router/**",
      "**/.next/**",
      "**/.vercel/**",
      "**/node_modules/**",
      "**/build/**",
      "**/public/build/**",
      "**/playwright-report/**",
      "**/playwright-results/**",
      "**/playwright/report/**",
      "**/playwright/results/**",
      "**/server-build/**",
      "**/dist/**",
      "**/coverage/**",
    ],
    rules,
    overrides,
  });
}

/**
 * @param {import("oxlint").OxlintConfig} [config]
 * @param {Features} [features] Explicit feature flags; omit to auto-detect via package resolution.
 */
export function createConfig(config = {}, features) {
  const baseConfig = buildBaseConfig(features);
  return defineConfig({
    ...baseConfig,
    ...config,
    categories: { ...baseConfig.categories, ...config.categories },
    env: { ...baseConfig.env, ...config.env },
    globals: { ...baseConfig.globals, ...config.globals },
    ignorePatterns: [...baseConfig.ignorePatterns, ...(config.ignorePatterns ?? [])],
    jsPlugins: [...(baseConfig.jsPlugins ?? []), ...(config.jsPlugins ?? [])],
    options: { ...baseConfig.options, ...config.options },
    overrides: [...baseConfig.overrides, ...(config.overrides ?? [])],
    plugins: [...new Set([...baseConfig.plugins, ...(config.plugins ?? [])])],
    rules: { ...baseConfig.rules, ...config.rules },
    settings: { ...baseConfig.settings, ...config.settings },
  });
}
