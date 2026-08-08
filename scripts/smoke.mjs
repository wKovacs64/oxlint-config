import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "fixtures/config.ts");
const oxlintBin = path.join(root, "node_modules/.bin/oxlint");

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

if (process.exitCode) {
  console.error("smoke failed");
  process.exit(process.exitCode);
}
console.log("smoke passed");
