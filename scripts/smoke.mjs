import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "../index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "fixtures/config.ts");
const oxlintBin = path.join(root, "node_modules/.bin/oxlint");
const { default: mergedConfig } = await import("../fixtures/config.ts");

function canResolve(pkg) {
  try {
    import.meta.resolve(pkg, import.meta.url);
    return true;
  } catch {
    return false;
  }
}

assert.deepEqual(mergedConfig.env, {
  browser: false,
  node: true,
  serviceworker: true,
});
assert.equal(mergedConfig.ignorePatterns.at(-1), "generated/**");
assert.equal(mergedConfig.options.typeAware, true);
assert.equal(mergedConfig.options.denyWarnings, true);
assert.equal(new Set(mergedConfig.plugins).size, mergedConfig.plugins.length);
assert.ok(mergedConfig.plugins.includes("vitest"));
assert.ok(mergedConfig.plugins.includes("react"));
assert.ok(mergedConfig.plugins.includes("jsx-a11y"));
assert.deepEqual(mergedConfig.settings.custom, { enabled: true });
assert.equal(mergedConfig.rules["react/react-compiler"], "warn");
assert.equal(mergedConfig.overrides.at(-1).files[0], "**/*.custom.ts");
console.log("ok createConfig merges consumer config");

// Feature flags (explicit beats auto-detect)
const noReact = createConfig({}, { react: false, vitest: false, astro: false });
assert.ok(!noReact.plugins.includes("react"));
assert.ok(!noReact.plugins.includes("jsx-a11y"));
assert.ok(!noReact.plugins.includes("vitest"));
assert.equal(noReact.rules["react/rules-of-hooks"], undefined);
assert.ok(!noReact.overrides.some((o) => o.env?.vitest));
assert.ok(!noReact.overrides.some((o) => o.env?.astro));
assert.ok(!noReact.overrides.some((o) => o.files?.includes?.("**/playwright/**")));
console.log("ok features all-off strips react/vitest/astro");

const allOn = createConfig({}, { react: true, vitest: true, astro: true });
assert.ok(allOn.plugins.includes("react"));
assert.ok(allOn.plugins.includes("jsx-a11y"));
assert.ok(allOn.plugins.includes("vitest"));
assert.equal(allOn.rules["react/rules-of-hooks"], "error");
assert.ok(allOn.overrides.some((o) => o.env?.vitest));
assert.ok(
  allOn.overrides.some(
    (o) => Array.isArray(o.files) && o.files.includes("**/*.astro") && o.env?.astro === true,
  ),
);
assert.ok(allOn.overrides.some((o) => o.files?.includes?.("**/playwright/**")));
console.log("ok features all-on enables react/vitest/astro");

// Auto-detect matches package tree resolution from this module
const detected = createConfig();
assert.equal(detected.plugins.includes("react"), canResolve("react"));
assert.equal(detected.plugins.includes("vitest"), canResolve("vitest"));
assert.equal(
  detected.overrides.some(
    (o) => Array.isArray(o.files) && o.files.includes("**/*.astro") && o.env?.astro === true,
  ),
  canResolve("astro"),
);
console.log("ok createConfig() auto-detect matches package tree");

/**
 * @param {string} file
 * @param {{ expectFail?: boolean, configPath?: string }} [opts]
 */
function run(file, { expectFail = false, configPath = config } = {}) {
  const target = path.join(root, "fixtures", file);
  const result = spawnSync(oxlintBin, ["-c", configPath, target], {
    encoding: "utf8",
    cwd: root,
  });
  const failed = result.status !== 0;
  const ok = expectFail ? failed : !failed;
  const label = expectFail ? "expect diagnostics" : "expect clean";
  if (!ok) {
    console.error(`FAIL ${file} (${label})`);
    console.error(result.stdout);
    console.error(result.stderr);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${file} (${label})`);
}

run("hooks-good.tsx");
run("hooks-bad.tsx", { expectFail: true });
run("compiler-bad.tsx", { expectFail: true });
run("unused-args-ok.ts");
run("test-import-bad.ts", { expectFail: true });
run("playwright/hooks-ok.ts");
run("playwright/focused.spec.ts");
run("vitest-focused-bad.test.ts", { expectFail: true });
run("role-img-ok.tsx");
run("role-required-bad.tsx", { expectFail: true });
run("side-effect-import-ok.ts");
run("unbound-method-ok.test.ts");
run("floating-promise-bad.ts", { expectFail: true });
run("void-expression-bad.ts", { expectFail: true });

const astroConfig = path.join(root, "fixtures/config-astro.ts");
run("astro-global-ok.astro", { configPath: astroConfig });
run("astro-global-bad.astro", { expectFail: true, configPath: astroConfig });

if (process.exitCode) {
  console.error("smoke failed");
  process.exit(process.exitCode);
}
console.log("smoke passed");
