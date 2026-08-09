import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "fixtures/config.ts");
const oxlintBin = path.join(root, "node_modules/.bin/oxlint");
const { default: mergedConfig } = await import("../fixtures/config.ts");

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
assert.deepEqual(mergedConfig.settings.custom, { enabled: true });
assert.equal(mergedConfig.rules["react/react-compiler"], "warn");
assert.equal(mergedConfig.overrides.at(-1).files[0], "**/*.custom.ts");
console.log("ok createConfig merges consumer config");

/**
 * @param {string} file
 * @param {{ expectFail?: boolean }} [opts]
 */
function run(file, { expectFail = false } = {}) {
  const target = path.join(root, "fixtures", file);
  const result = spawnSync(oxlintBin, ["-c", config, target], {
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

if (process.exitCode) {
  console.error("smoke failed");
  process.exit(process.exitCode);
}
console.log("smoke passed");
