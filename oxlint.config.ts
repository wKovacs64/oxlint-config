import { createConfig } from "./index.js";

export default createConfig({
  // Intentional rule-trigger fixtures; exercised by `pnpm test`
  ignorePatterns: ["fixtures/**"],
});
