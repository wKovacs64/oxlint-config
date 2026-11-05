import { createConfig } from "./index.js";

export default createConfig({
  ignorePatterns: [
    // Intentional rule-trigger fixtures; exercised by `pnpm test`
    "fixtures/**",
    // Vendored by scripts/vendor-anti-slop.mjs
    "plugins/anti-slop/**",
  ],
});
