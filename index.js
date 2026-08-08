import { defineConfig } from "oxlint";

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

    // Selective ports from @wkovacs64/eslint-config
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

    // High-signal TS tweaks only; prefer Oxlint defaults otherwise
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/ban-ts-comment": "off",
    "typescript/consistent-type-definitions": "off",

    "vitest/no-focused-tests": "warn",
  },
});
