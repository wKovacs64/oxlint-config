import { defineConfig } from "oxlint";

const testGlobs = ["**/tests/**", "**/#tests/**", "**/__tests__/**", "**/*.{test,spec}.*"];

const playwrightGlobs = ["**/playwright/**"];

export default defineConfig({
  // Setting `plugins` replaces defaults — include the full desired set.
  plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "vitest"],
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

    "import/no-duplicates": ["warn", { preferInline: true }],

    // High-signal TS tweaks; prefer Oxlint defaults otherwise
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
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
