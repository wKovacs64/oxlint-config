import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "../index.js";
import { isRecord, isString } from "../plugins/guards.js";

/** @import { OxlintOverride } from "oxlint" */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "fixtures/config.ts");
const oxlintBin = path.join(root, "node_modules/.bin/oxlint");
const { default: mergedConfig } = await import("../fixtures/config.ts");

/** @param {string} pkg */
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

/** @type {unknown} */
const packOutput = JSON.parse(packResult.stdout);

assert.ok(
  isRecord(packOutput) && Array.isArray(packOutput.files),
  "pnpm pack --json output has files",
);

const packFiles = packOutput.files.map((file) => (isRecord(file) ? file.path : undefined));

for (const file of [
  "plugins/module-boundaries.js",
  "plugins/conventions.js",
  "plugins/guards.js",
  "plugins/anti-slop/index.js",
  "plugins/anti-slop/LICENSE",
]) {
  assert.ok(packFiles.includes(file), `package includes ${file}`);
}

console.log("ok package includes plugins");

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

assert.equal(mergedConfig.rules["no-debugger"], "warn");

assert.equal(mergedConfig.overrides.at(-1)?.files[0], "**/*.custom.ts");

console.log("ok createConfig merges consumer config");

// Feature flags (explicit beats auto-detect)
const allOff = { react: false, remix: false, vitest: false, playwright: false, astro: false };

/**
 * @param {OxlintOverride | undefined} override
 */
function overrideRules(override) {
  assert.ok(override?.rules, "override has rules");

  return override.rules;
}

/**
 * @param {OxlintOverride[]} overrides
 */
function playwrightOverride(overrides) {
  return overrides.find((o) => o.files.length === 1 && o.files[0] === "**/playwright/**");
}

const noReact = createConfig({}, allOff);

assert.ok(!noReact.plugins.includes("react"));

assert.ok(!noReact.plugins.includes("jsx-a11y"));

assert.ok(!noReact.plugins.includes("vitest"));

assert.ok(
  !Object.keys(noReact.rules).some(
    (name) => name.startsWith("react/") || name.startsWith("jsx-a11y/"),
  ),
);

assert.ok(!noReact.overrides.some((o) => o.env?.vitest === true));

assert.ok(!noReact.overrides.some((o) => o.env?.astro === true));

assert.equal(playwrightOverride(noReact.overrides), undefined);

assert.ok(!noReact.jsPlugins.some((plugin) => isRecord(plugin) && plugin.name === "playwright"));

assert.equal(noReact.categories.suspicious, "error");

assert.equal(noReact.options.reportUnusedDisableDirectives, "error");

assert.ok(
  Object.values(noReact.rules).every((rule) => {
    const severity = Array.isArray(rule) ? rule[0] : rule;

    return severity === "error" || severity === "off";
  }),
  "every configured rule is an error or off",
);

console.log("ok features all-off strips react/remix/vitest/playwright/astro");

const jsxRules = {
  "react/jsx-key": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/jsx-no-undef": "error",
  "react/jsx-props-no-spread-multi": "error",
  "react/void-dom-elements-no-children": "error",
  "react/iframe-missing-sandbox": "error",
  "react/jsx-no-comment-textnodes": "error",
  "react/jsx-no-script-url": "error",
  "react/no-unescaped-entities": "error",
  "react/jsx-no-target-blank": "error",
};

const remixOnly = createConfig({}, { ...allOff, remix: true });

assert.ok(remixOnly.plugins.includes("react"));

assert.ok(remixOnly.plugins.includes("jsx-a11y"));

assert.equal(remixOnly.rules["react/rules-of-hooks"], "off");

assert.equal(remixOnly.rules["react/display-name"], "off");

assert.equal(remixOnly.rules["react/no-unknown-property"], "off");

assert.deepEqual(
  Object.fromEntries(
    Object.entries(remixOnly.rules).filter(
      ([name, severity]) => name.startsWith("react/") && severity !== "off",
    ),
  ),
  jsxRules,
);

assert.deepEqual(remixOnly.rules["jsx-a11y/label-has-associated-control"], [
  "error",
  { assert: "either" },
]);

assert.equal(remixOnly.rules["jsx-a11y/prefer-tag-over-role"], "off");

assert.ok(
  !remixOnly.overrides.some((o) =>
    Object.keys(o.rules ?? {}).some((name) => name.startsWith("react/")),
  ),
);

console.log("ok remix enables JSX and accessibility rules without React-only rules");

const allOnFeatures = { react: true, remix: false, vitest: true, playwright: true, astro: true };
const allOn = createConfig({}, allOnFeatures);

assert.ok(allOn.plugins.includes("react"));

assert.ok(allOn.plugins.includes("jsx-a11y"));

assert.ok(allOn.plugins.includes("vitest"));

assert.equal(allOn.rules["react/rules-of-hooks"], "error");

assert.equal(allOn.rules["react/hooks"], "off");

assert.ok(Object.entries(jsxRules).every(([name, severity]) => allOn.rules[name] === severity));

assert.deepEqual(allOn.rules["jsx-a11y/label-has-associated-control"], [
  "error",
  { assert: "either" },
]);

assert.equal(allOn.rules["jsx-a11y/prefer-tag-over-role"], "off");

assert.deepEqual(createConfig({}, { ...allOnFeatures, remix: true }), allOn);

const reactCompilerRuleNames = [
  "capitalized-calls",
  "exhaustive-effect-dependencies",
  "invariant",
  "memo-dependencies",
  "no-deriving-state-in-effects",
  "rule-suppression",
  "syntax",
  "todo",
  "unsupported-syntax",
];

assert.ok(reactCompilerRuleNames.every((name) => allOn.rules[`react/${name}`] === "error"));

assert.ok(allOn.overrides.some((o) => o.env?.vitest === true));

assert.ok(allOn.overrides.some((o) => o.files.includes("**/*.astro") && o.env?.astro === true));

const playwrightOffs = overrideRules(playwrightOverride(allOn.overrides));

assert.equal(playwrightOffs["no-empty-pattern"], "off");

assert.ok(
  ["rules-of-hooks", "hooks", ...reactCompilerRuleNames].every(
    (name) => playwrightOffs[`react/${name}`] === "off",
  ),
  "every playwright react/* rule must be disabled",
);

const vitestOffEntries = Object.entries(playwrightOffs).filter(([k]) => k.startsWith("vitest/"));

assert.ok(vitestOffEntries.length > 0);

assert.ok(
  vitestOffEntries.every(([, severity]) => severity === "off"),
  "every playwright vitest/* rule must be disabled",
);

assert.equal(playwrightOffs["vitest/expect-expect"], "off");

assert.equal(playwrightOffs["vitest/no-focused-tests"], "off");

const vitestOverride = allOn.overrides.find((o) => o.env?.vitest === true);

assert.deepEqual(vitestOverride?.excludeFiles, ["**/playwright/**/*.spec.*"]);

assert.equal(overrideRules(vitestOverride)["vitest/no-focused-tests"], "error");

const playwrightSpecRules = overrideRules(
  allOn.overrides.find((o) => o.files[0] === "**/playwright/**/*.spec.*"),
);

assert.equal(playwrightSpecRules["playwright/no-focused-test"], "error");

assert.equal(playwrightSpecRules["playwright/missing-playwright-await"], "error");

assert.ok(allOn.jsPlugins.some((plugin) => isRecord(plugin) && plugin.name === "playwright"));

console.log("ok features all-on enables react/vitest/playwright/astro and isolates playwright");

playwrightOffs["vitest/expect-expect"] = "error";

assert.equal(
  overrideRules(playwrightOverride(createConfig({}, allOnFeatures).overrides))[
    "vitest/expect-expect"
  ],
  "off",
);

console.log("ok createConfig results own playwright override graphs");

// Auto-detect matches package tree resolution from this module
const detected = createConfig();
const detectedJsx = canResolve("react") || canResolve("remix/component");

assert.equal(detected.plugins.includes("react"), detectedJsx);

assert.equal(detected.plugins.includes("jsx-a11y"), detectedJsx);

assert.equal(detected.rules["react/rules-of-hooks"] === "error", canResolve("react"));

assert.equal(detected.plugins.includes("vitest"), canResolve("vitest"));

assert.equal(
  detected.jsPlugins.some((plugin) => isRecord(plugin) && plugin.name === "playwright"),
  canResolve("@playwright/test"),
);

assert.equal(
  detected.overrides.some((o) => o.files.includes("**/*.astro") && o.env?.astro === true),
  canResolve("astro"),
);

console.log("ok createConfig() auto-detect matches package tree");

/**
 * Diagnostics without a rule code (unused disable directives) are matched by message.
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

  /**
   * @param {string} reason
   * @param {string} [detail]
   */
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

  /** @type {unknown} */
  let payload;

  try {
    payload = JSON.parse(result.stdout);
  } catch {
    fail("invalid json output", result.stdout?.trim());

    return;
  }

  if (!isRecord(payload) || !Array.isArray(payload.diagnostics)) {
    fail("json output has no diagnostics array");

    return;
  }

  const actual = payload.diagnostics
    .filter(isRecord)
    .map(({ code, message, severity }) => [severity, isString(code) ? code : message].join(" "))
    .toSorted();

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

/** @param {string} file */
const fixture = (file) => path.join(root, "fixtures", file);

/** @param {string} code */
const error = (code) => [{ code, severity: "error" }];

/**
 * Installs this package into `<dir>/node_modules` as a consumer would see it.
 * @param {string} dir
 */
function installIsolatedPackage(dir) {
  const isolatedPackage = path.join(dir, "node_modules", "@wkovacs64", "oxlint-config");

  mkdirSync(isolatedPackage, { recursive: true });

  for (const file of ["index.js", "index.d.ts", "package.json"]) {
    copyFileSync(path.join(root, file), path.join(isolatedPackage, file));
  }

  cpSync(path.join(root, "plugins"), path.join(isolatedPackage, "plugins"), { recursive: true });

  for (const dependency of ["oxlint", "@oxlint/plugins", "eslint-plugin-playwright"]) {
    const target = path.join(dir, "node_modules", dependency);

    mkdirSync(path.dirname(target), { recursive: true });
    symlinkSync(path.join(root, "node_modules", dependency), target, "dir");
  }
}

// Playwright's own rules apply to specs; Vitest's must not leak into them.
const focusedNoAssertions = [
  ...error("playwright(no-focused-test)"),
  ...error("playwright(expect-expect)"),
];

runJson(fixture("hooks-good.tsx"));

runJson(fixture("hooks-bad.tsx"), { expected: error("react-hooks(rules-of-hooks)") });

runJson(fixture("compiler-bad.tsx"), { expected: error("react(refs)") });

runJson(fixture("unused-args-ok.ts"));

runJson(fixture("test-import-bad.ts"), { expected: error("eslint(no-restricted-imports)") });

runJson(fixture("playwright/hooks-ok.ts"));

runJson(fixture("playwright/focused.spec.ts"), { expected: focusedNoAssertions });

runJson(fixture("playwright/test-base.ts"));

runJson(fixture("playwright/direct.spec.ts"), { expected: focusedNoAssertions });

runJson(fixture("playwright/custom-fixture.spec.ts"), { expected: focusedNoAssertions });

runJson(fixture("playwright/leak-probe.spec.ts"), {
  expected: [...focusedNoAssertions, ...error("playwright(expect-expect)")],
});

runJson(fixture("vitest-focused-bad.test.ts"), {
  expected: error("vitest(no-focused-tests)"),
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

runJson(fixture("disable-reason-bad.ts"), {
  expected: error("conventions(require-disable-reason)"),
});

runJson(fixture("disable-reason-ok.ts"));

runJson(fixture("unused-disable-bad.ts"), {
  expected: error("Unused oxlint-disable directive (no problems were reported)."),
});

runJson(fixture("type-name-casing-bad.ts"), {
  expected: [...error("conventions(type-name-casing)"), ...error("conventions(type-name-casing)")],
});

runJson(fixture("type-assertion-bad.ts"), {
  expected: error("anti-slop(require-safety-comment-for-type-assertion)"),
});

runJson(fixture("type-assertion-ok.ts"));

runJson(fixture("void-expression-bad.ts"), {
  expected: error("typescript(no-confusing-void-expression)"),
});

const remixConfig = path.join(root, "fixtures/config-remix.ts");

runJson(fixture("remix/component-ok.tsx"), { configPath: remixConfig });

runJson(fixture("remix/jsx-key-bad.tsx"), {
  configPath: remixConfig,
  expected: error("react(jsx-key)"),
});

runJson(fixture("remix/alt-text-bad.tsx"), {
  configPath: remixConfig,
  expected: error("jsx-a11y(alt-text)"),
});

const astroConfig = path.join(root, "fixtures/config-astro.ts");

runJson(fixture("astro-global-ok.astro"), { configPath: astroConfig });

runJson(fixture("astro-global-bad.astro"), {
  configPath: astroConfig,
  expected: error("eslint(no-undef)"),
});

const isolatedRoot = mkdtempSync(path.join(tmpdir(), "oxlint-config-no-vitest-"));

try {
  installIsolatedPackage(isolatedRoot);

  const isolatedConfigPath = path.join(isolatedRoot, "oxlint.config.mjs");
  writeFileSync(
    isolatedConfigPath,
    'import { createConfig } from "@wkovacs64/oxlint-config";\nexport default createConfig({ options: { typeAware: false } });\n',
  );
  const isolatedProbe = path.join(isolatedRoot, "playwright", "leak-probe.spec.ts");
  mkdirSync(path.dirname(isolatedProbe));
  copyFileSync(fixture("playwright/leak-probe.spec.ts"), isolatedProbe);
  runJson(isolatedProbe, {
    configPath: isolatedConfigPath,
    label: "isolated consumer without Vitest",
  });
  console.log("ok isolated auto-detection omits Vitest and Playwright layers");

  const isolatedJsxProbe = path.join(isolatedRoot, "role-required-bad.tsx");
  copyFileSync(fixture("role-required-bad.tsx"), isolatedJsxProbe);
  runJson(isolatedJsxProbe, {
    configPath: isolatedConfigPath,
    label: "isolated JSX without React or Remix defaults to no accessibility",
  });
  writeFileSync(
    isolatedConfigPath,
    'import { createConfig } from "@wkovacs64/oxlint-config";\nexport default createConfig({ options: { typeAware: false } }, { remix: true });\n',
  );
  runJson(isolatedJsxProbe, {
    configPath: isolatedConfigPath,
    expected: error("jsx-a11y(role-has-required-aria-props)"),
    label: "isolated JSX without React opts into Remix",
  });
  const isolatedJsxOk = path.join(isolatedRoot, "role-img-ok.tsx");
  copyFileSync(fixture("role-img-ok.tsx"), isolatedJsxOk);
  runJson(isolatedJsxOk, {
    configPath: isolatedConfigPath,
    label: "isolated JSX without React accepts accessible markup",
  });
} finally {
  rmSync(isolatedRoot, { recursive: true, force: true });
}

const boundariesRoot = mkdtempSync(path.join(tmpdir(), "oxlint-config-module-boundaries-"));

try {
  installIsolatedPackage(boundariesRoot);

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

  /**
   * @param {string} relative
   * @param {string} source
   */
  const boundaryFile = (relative, source) => {
    const filename = path.join(boundariesRoot, relative);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, `${source}\n`);

    return filename;
  };

  /**
   * @param {string} relative
   * @param {string} source
   * @param {ExpectedDiagnostic[]} [expected]
   */
  const boundaryRun = (relative, source, expected = []) =>
    runJson(boundaryFile(relative, source), {
      configPath: boundariesConfig,
      cwd: boundariesRoot,
      expected,
      label: `module boundaries: ${relative}`,
    });

  const nativeBoundaryError = error("eslint(no-restricted-imports)");
  const relativeBoundaryError = error("module-boundaries(no-relative-module-imports)");
  const parentImportError = error("module-boundaries(no-parent-imports)");

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
  boundaryRun("app/routes/relative-public.ts", 'import "../modules/alpha/alpha";', [
    ...relativeBoundaryError,
    ...parentImportError,
  ]);

  boundaryRun("app/routes/admin/parent.ts", 'import "../utils/db";', parentImportError);
  boundaryRun(
    "app/routes/admin/parent-reexport.ts",
    'export * from "../utils/db";',
    parentImportError,
  );
  boundaryRun("app/routes/admin/sibling.ts", 'import "./helpers";');
  boundaryRun("app/routes/admin/alias.ts", 'import "#/app/utils/db";');
  boundaryRun("app/routes/admin/dynamic.ts", 'await import("../utils/db");');
  boundaryRun(
    "app/routes/deep-alias.astro",
    '---\nimport "#/app/modules/alpha/internal";\n---',
    nativeBoundaryError,
  );
  boundaryRun(
    "app/routes/relative-deep.astro",
    '<script>\nimport "../modules/alpha/internal";\n</script>',
    [...relativeBoundaryError, ...parentImportError],
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

if (process.exitCode === 1) {
  console.error("smoke failed");
  process.exit(process.exitCode);
}

console.log("smoke passed");
