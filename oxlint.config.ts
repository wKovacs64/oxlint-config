import { defineConfig } from "oxlint";
import baseConfig from "./index.js";

export default defineConfig({
  extends: [baseConfig],
  // Intentional rule-trigger fixtures; exercised by `pnpm test`
  ignorePatterns: ["fixtures/**"],
});
