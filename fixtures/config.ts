import { createConfig } from "../index.js";

export default createConfig({
  env: {
    browser: false,
    serviceworker: true,
  },
  ignorePatterns: ["generated/**"],
  options: {
    denyWarnings: true,
  },
  plugins: ["eslint"],
  rules: {
    "no-debugger": "warn",
  },
  settings: {
    custom: {
      enabled: true,
    },
  },
  overrides: [
    {
      files: ["**/*.custom.ts"],
      rules: {
        "no-debugger": "off",
      },
    },
  ],
});
