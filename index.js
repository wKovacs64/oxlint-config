import { defineConfig } from "oxlint";

const vitestGlobs = ["**/__tests__/**/*", "**/*.test.*"];
const testGlobs = ["**/tests/**", "**/#tests/**", ...vitestGlobs];
const playwrightGlobs = ["**/playwright/**"];
const playwrightTestGlobs = ["**/playwright/**/*.spec.*"];

const baseConfig = defineConfig({
  // Setting `plugins` replaces defaults — include the full desired set.
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "vitest"],
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
  rules: {
    // React hooks + compiler (primary requirement)
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
  },
  overrides: [
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
    {
      files: testGlobs,
      excludeFiles: playwrightTestGlobs,
      env: {
        vitest: true,
      },
      rules: {
        "vitest/no-focused-tests": "warn",
      },
    },
    {
      // Playwright specs aren't React components/hooks consumers
      files: playwrightGlobs,
      rules: {
        "react/rules-of-hooks": "off",
        "react/exhaustive-deps": "off",
        "react/react-compiler": "off",
      },
    },
  ],
});

export function createConfig(config = {}) {
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
