import { createConfig } from "../index.js";

// Force Astro support on without requiring the `astro` package in this repo.
export default createConfig(
  {
    options: {
      // fixtures only need script/frontmatter lint
      typeAware: false,
    },
  },
  { astro: true },
);
