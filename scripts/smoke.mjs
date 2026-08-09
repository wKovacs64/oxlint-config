import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

const packResult = spawnSync("pnpm", ["pack", "--dry-run", "--json"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(packResult.status, 0, packResult.stderr);
const packFiles = JSON.parse(packResult.stdout).files.map(({ path: filename }) => filename);
assert.ok(packFiles.includes("plugins/module-boundaries.js"));
console.log("ok package includes module-boundaries plugin");

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

const vitestOverride = allOn.overrides.find((o) => o.env?.vitest);
assert.ok(vitestOverride);
assert.deepEqual(vitestOverride.excludeFiles, ["**/playwright/**/*.spec.*"]);
assert.equal(vitestOverride.rules["vitest/no-focused-tests"], "warn");

const playwrightVitestOff = allOn.overrides.find(
  (o) =>
    Array.isArray(o.files) &&
    o.files.includes("**/playwright/**") &&
    o.rules &&
    Object.keys(o.rules).some((k) => k.startsWith("vitest/")),
);
assert.ok(playwrightVitestOff, "playwright override must disable vitest/* rules");
const vitestOffEntries = Object.entries(playwrightVitestOff.rules).filter(([k]) =>
  k.startsWith("vitest/"),
);
assert.ok(vitestOffEntries.length > 0);
assert.ok(
  vitestOffEntries.every(([, severity]) => severity === "off"),
  "every playwright vitest/* rule must be disabled",
);
assert.ok(
  vitestOffEntries.some(([k]) => k === "vitest/expect-expect"),
  "category-enabled vitest/expect-expect must be disabled on playwright paths",
);
assert.ok(
  vitestOffEntries.some(([k]) => k === "vitest/no-focused-tests"),
  "category-enabled vitest/no-focused-tests must be disabled on playwright paths",
);
console.log("ok features all-on enables react/vitest/astro and isolates playwright");

vitestOverride.files[0] = "**/mutated-tests/**";
vitestOverride.excludeFiles[0] = "**/mutated-playwright/**";
playwrightVitestOff.files[0] = "**/mutated-playwright/**";
playwrightVitestOff.rules["vitest/expect-expect"] = "error";
const independentConfig = createConfig({}, { react: true, vitest: true, astro: true });
const independentVitestOverride = independentConfig.overrides.find((o) => o.env?.vitest);
const independentPlaywrightVitestOff = independentConfig.overrides.find(
  (o) =>
    Array.isArray(o.files) &&
    o.files.includes("**/playwright/**") &&
    o.rules?.["vitest/expect-expect"],
);
assert.equal(independentVitestOverride.files[0], "**/tests/**");
assert.equal(independentVitestOverride.excludeFiles[0], "**/playwright/**/*.spec.*");
assert.deepEqual(independentPlaywrightVitestOff.files, ["**/playwright/**"]);
assert.equal(independentPlaywrightVitestOff.rules["vitest/expect-expect"], "off");
console.log("ok createConfig results own playwright vitest override graphs");

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
 * @typedef {{ code: string, severity: string }} ExpectedDiagnostic
 */

/**
 * @param {string} target
 * @param {{ configPath?: string, cwd?: string, expected?: ExpectedDiagnostic[], label?: string }} [opts]
 */
function runJson(target, { configPath = config, cwd = root, expected = [], label } = {}) {
  const display = label ?? path.relative(path.join(root, "fixtures"), target);
  const result = spawnSync(oxlintBin, ["-c", configPath, "-f", "json", target], {
    encoding: "utf8",
    cwd,
  });
  const stderr = result.stderr?.trim() ?? "";
  const fail = (reason, detail = "") => {
    console.error(`FAIL ${display} (${reason})`);
    if (result.error) console.error(result.error.message);
    if (stderr) console.error(stderr);
    if (detail) console.error(detail);
    process.exitCode = 1;
  };

  if (result.error || result.signal || stderr) {
    fail(result.signal ? `terminated by ${result.signal}` : "oxlint execution failed");
    return;
  }

  /** @type {{ diagnostics?: Array<ExpectedDiagnostic> }} */
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    fail("invalid json output", result.stdout?.trim());
    return;
  }
  if (!Array.isArray(payload.diagnostics)) {
    fail("json output has no diagnostics array");
    return;
  }

  const actual = payload.diagnostics.map(({ code, severity }) => `${severity} ${code}`).toSorted();
  const wanted = expected.map(({ code, severity }) => `${severity} ${code}`).toSorted();
  const expectedStatus = wanted.length === 0 ? 0 : 1;
  if (result.status !== expectedStatus || actual.join("\n") !== wanted.join("\n")) {
    fail(
      `expected status ${expectedStatus} and [${wanted.join(", ")}], got ${result.status} and [${actual.join(", ")}]`,
    );
    return;
  }

  console.log(`ok ${display} (${wanted.length === 0 ? "clean" : wanted.join(", ")})`);
}

const fixture = (file) => path.join(root, "fixtures", file);
const error = (code) => [{ code, severity: "error" }];
const warning = (code) => [{ code, severity: "warning" }];

runJson(fixture("hooks-good.tsx"));
runJson(fixture("hooks-bad.tsx"), {
  expected: [
    { code: "react(react-compiler)", severity: "warning" },
    { code: "react-hooks(rules-of-hooks)", severity: "error" },
  ],
});
runJson(fixture("compiler-bad.tsx"), { expected: warning("react(react-compiler)") });
runJson(fixture("unused-args-ok.ts"));
runJson(fixture("test-import-bad.ts"), { expected: error("eslint(no-restricted-imports)") });
runJson(fixture("playwright/hooks-ok.ts"));
runJson(fixture("playwright/focused.spec.ts"));
runJson(fixture("playwright/test-base.ts"));
runJson(fixture("playwright/direct.spec.ts"));
runJson(fixture("playwright/custom-fixture.spec.ts"));
runJson(fixture("playwright/leak-probe.spec.ts"));
runJson(fixture("vitest-focused-bad.test.ts"), {
  expected: warning("vitest(no-focused-tests)"),
});
runJson(fixture("vitest-no-expect-bad.test.ts"), {
  expected: error("vitest(expect-expect)"),
});
runJson(fixture("vitest-untyped-mock-bad.test.ts"), {
  expected: error("vitest(require-mock-type-parameters)"),
});
runJson(fixture("role-img-ok.tsx"));
runJson(fixture("role-required-bad.tsx"), {
  expected: error("jsx-a11y(role-has-required-aria-props)"),
});
runJson(fixture("side-effect-import-ok.ts"));
runJson(fixture("unbound-method-ok.test.ts"));
runJson(fixture("floating-promise-bad.ts"), {
  expected: error("typescript(no-floating-promises)"),
});
runJson(fixture("void-expression-bad.ts"), {
  expected: error("typescript(no-confusing-void-expression)"),
});

const astroConfig = path.join(root, "fixtures/config-astro.ts");
runJson(fixture("astro-global-ok.astro"), { configPath: astroConfig });
runJson(fixture("astro-global-bad.astro"), {
  configPath: astroConfig,
  expected: error("eslint(no-undef)"),
});

const isolatedRoot = mkdtempSync(path.join(tmpdir(), "oxlint-config-no-vitest-"));
try {
  const isolatedPackage = path.join(isolatedRoot, "node_modules", "@wkovacs64", "oxlint-config");
  mkdirSync(isolatedPackage, { recursive: true });
  copyFileSync(path.join(root, "index.js"), path.join(isolatedPackage, "index.js"));
  writeFileSync(
    path.join(isolatedPackage, "package.json"),
    JSON.stringify({ name: "@wkovacs64/oxlint-config", type: "module", exports: "./index.js" }),
  );
  symlinkSync(
    path.join(root, "node_modules", "oxlint"),
    path.join(isolatedRoot, "node_modules", "oxlint"),
    "dir",
  );

  const isolatedIndex = path.join(isolatedPackage, "index.js");
  const { createConfig: createIsolatedConfig } = await import(pathToFileURL(isolatedIndex));
  const isolatedConfig = createIsolatedConfig();
  assert.ok(!isolatedConfig.plugins.includes("vitest"));
  assert.ok(!isolatedConfig.overrides.some((o) => o.env?.vitest));
  assert.ok(!isolatedConfig.overrides.some((o) => o.files?.includes?.("**/playwright/**")));

  const isolatedConfigPath = path.join(isolatedRoot, "oxlint.config.mjs");
  writeFileSync(
    isolatedConfigPath,
    'import { createConfig } from "@wkovacs64/oxlint-config";\nexport default createConfig();\n',
  );
  const isolatedProbe = path.join(isolatedRoot, "playwright", "leak-probe.spec.ts");
  mkdirSync(path.dirname(isolatedProbe));
  copyFileSync(fixture("playwright/leak-probe.spec.ts"), isolatedProbe);
  runJson(isolatedProbe, {
    configPath: isolatedConfigPath,
    label: "isolated consumer without Vitest",
  });
  console.log("ok isolated auto-detection omits Vitest layer");
} finally {
  rmSync(isolatedRoot, { recursive: true, force: true });
}

const boundariesRoot = mkdtempSync(path.join(tmpdir(), "oxlint-config-module-boundaries-"));
try {
  const isolatedPackage = path.join(boundariesRoot, "node_modules", "@wkovacs64", "oxlint-config");
  mkdirSync(path.join(isolatedPackage, "plugins"), { recursive: true });
  copyFileSync(path.join(root, "index.js"), path.join(isolatedPackage, "index.js"));
  copyFileSync(
    path.join(root, "plugins/module-boundaries.js"),
    path.join(isolatedPackage, "plugins/module-boundaries.js"),
  );
  copyFileSync(path.join(root, "package.json"), path.join(isolatedPackage, "package.json"));
  symlinkSync(
    path.join(root, "node_modules", "oxlint"),
    path.join(boundariesRoot, "node_modules", "oxlint"),
    "dir",
  );

  const modulesRoot = path.join(boundariesRoot, "app/modules");
  for (const moduleName of ["alpha", "beta", "special[one]"]) {
    mkdirSync(path.join(modulesRoot, moduleName, "nested"), { recursive: true });
    writeFileSync(path.join(modulesRoot, moduleName, `${moduleName}.ts`), "export {};\n");
    writeFileSync(path.join(modulesRoot, moduleName, `${moduleName}.server.ts`), "export {};\n");
    writeFileSync(path.join(modulesRoot, moduleName, "internal.ts"), "export {};\n");
  }
  const boundariesConfig = path.join(boundariesRoot, "oxlint.config.mjs");
  writeFileSync(
    boundariesConfig,
    [
      'import { createConfig } from "@wkovacs64/oxlint-config";',
      "export default createConfig(",
      "  { options: { typeAware: false } },",
      '  { react: false, vitest: false, astro: true, moduleBoundaries: { modulesPath: "#/app/modules" } },',
      ");",
      "",
    ].join("\n"),
  );

  const boundaryFile = (relative, source) => {
    const filename = path.join(boundariesRoot, relative);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, `${source}\n`);
    return filename;
  };
  const boundaryRun = (relative, source, expected = []) =>
    runJson(boundaryFile(relative, source), {
      configPath: boundariesConfig,
      cwd: boundariesRoot,
      expected,
      label: `module boundaries: ${relative}`,
    });
  const nativeBoundaryError = error("eslint(no-restricted-imports)");
  const relativeBoundaryError = error("module-boundaries(no-relative-module-imports)");

  boundaryRun("app/routes/public-client.ts", 'import "#/app/modules/alpha/alpha";');
  boundaryRun(
    "app/routes/public-server.ts",
    'export * from "#/app/modules/alpha/alpha.server.ts";',
  );
  boundaryRun(
    "app/routes/internal.ts",
    'import "#/app/modules/alpha/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/routes/module-directory.ts",
    'import "#/app/modules/alpha";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/routes/escaped-module-public.ts",
    'import "#/app/modules/special[one]/special[one]";',
  );
  boundaryRun(
    "app/routes/escaped-module-internal.ts",
    'import "#/app/modules/special[one]/internal";',
    nativeBoundaryError,
  );
  boundaryRun("app/modules/alpha/nested/own-internal.ts", 'import "../internal";');
  boundaryRun("app/modules/alpha/own-alias.ts", 'import "#/app/modules/alpha/internal";');
  boundaryRun("app/modules/alpha/test-import.ts", 'import "./own.test";', nativeBoundaryError);
  boundaryRun("app/modules/alpha/cross-public.ts", 'import "#/app/modules/beta/beta.js";');
  boundaryRun(
    "app/modules/alpha/traversal-import.ts",
    'import "#/app/modules/alpha/./internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/traversal-reexport.ts",
    'export * from "#/app/modules/alpha/nested/../../beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/repeated-separator-traversal.ts",
    'import "#/app/modules/alpha//../beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/repeated-separator-reexport.ts",
    'export * from "#/app/modules/alpha//./internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/routes/repeated-separator.ts",
    'import "#/app/modules//beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/repeated-separator-cross-reexport.ts",
    'export * from "#/app/modules/beta//internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/orphan.ts",
    'import "#/app/modules/beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/special[one]/cross-deep.ts",
    'import "#/app/modules/beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/cross-deep.ts",
    'export * from "#/app/modules/beta/internal";',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/relative-public.ts",
    'import "../beta/beta";',
    relativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/relative-internal.ts",
    'import "../beta/internal";',
    relativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/reexport-public.ts",
    'export { value } from "../beta/beta";',
    relativeBoundaryError,
  );
  boundaryRun(
    "app/modules/alpha/reexport-internal.ts",
    'export * from "../beta/internal";',
    relativeBoundaryError,
  );
  boundaryRun(
    "app/routes/relative-public.ts",
    'import "../modules/alpha/alpha";',
    relativeBoundaryError,
  );
  boundaryRun(
    "app/routes/deep-alias.astro",
    '---\nimport "#/app/modules/alpha/internal";\n---',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/routes/relative-deep.astro",
    '<script>\nimport "../modules/alpha/internal";\n</script>',
    relativeBoundaryError,
  );
  boundaryRun("app/routes/test-import.astro", '---\nimport "./route.test";\n---');

  const customModulesRoot = path.join(boundariesRoot, "src/features/gamma");
  mkdirSync(customModulesRoot, { recursive: true });
  writeFileSync(path.join(customModulesRoot, "gamma.ts"), "export {};\n");
  writeFileSync(path.join(customModulesRoot, "private.ts"), "export {};\n");
  const customConfig = path.join(boundariesRoot, "oxlint.custom.config.mjs");
  writeFileSync(
    customConfig,
    [
      'import { createConfig } from "@wkovacs64/oxlint-config";',
      "export default createConfig(",
      "  { options: { typeAware: false } },",
      '  { react: false, vitest: false, astro: false, moduleBoundaries: { modulesPath: "#/src/features" } },',
      ");",
      "",
    ].join("\n"),
  );
  runJson(boundaryFile("src/custom-public.ts", 'import "#/src/features/gamma/gamma.ts";'), {
    configPath: customConfig,
    cwd: boundariesRoot,
    label: "module boundaries: custom path public",
  });
  runJson(boundaryFile("src/custom-internal.ts", 'import "#/src/features/gamma/private";'), {
    configPath: customConfig,
    cwd: boundariesRoot,
    expected: nativeBoundaryError,
    label: "module boundaries: custom path internal",
  });
  console.log("ok isolated consumer resolves shipped module-boundaries plugin");

  const originalCwd = process.cwd();
  process.chdir(boundariesRoot);
  try {
    assert.throws(
      () =>
        createConfig(
          {},
          {
            react: false,
            vitest: false,
            astro: false,
            moduleBoundaries: { modulesPath: "#/missing/modules" },
          },
        ),
      /Module boundaries directory does not exist/,
    );
    assert.throws(
      () =>
        createConfig(
          {},
          {
            react: false,
            vitest: false,
            astro: false,
            moduleBoundaries: { modulesPath: "app/modules" },
          },
        ),
      /must be a #\/ alias path/,
    );
  } finally {
    process.chdir(originalCwd);
  }
  console.log("ok module boundaries reject missing directories and invalid aliases");
} finally {
  rmSync(boundariesRoot, { recursive: true, force: true });
}

if (process.exitCode) {
  console.error("smoke failed");
  process.exit(process.exitCode);
}
console.log("smoke passed");
