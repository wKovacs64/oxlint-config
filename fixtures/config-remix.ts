import { createConfig } from "../index.js";

// Remix without React, even though `react` resolves in this repo.
export default createConfig({}, { react: false, remix: true });
