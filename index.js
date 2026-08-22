import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

const vitestGlobs = ["**/__tests__/**/*", "**/*.test.*"];
const testGlobs = ["**/tests/**", "**/#tests/**", ...vitestGlobs];
const playwrightGlobs = ["**/playwright/**"];
const playwrightTestGlobs = ["**/playwright/**/*.spec.*"];
const sourceGlobs = ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"];
const moduleBoundaryGlobs = [...sourceGlobs, "**/*.astro"];
const sourceExtensions = ["js", "jsx", "cjs", "mjs", "ts", "tsx", "cts", "mts"];
const moduleBoundariesPlugin = fileURLToPath(
  new URL("./plugins/module-boundaries.js", import.meta.url),
);
/**
 * @param {string} pkgName
 */
function has(pkgName) {
  try {
    import.meta.resolve(pkgName, import.meta.url);
    return true;
  } catch {
    return false;
  }
}

/** @type {string[] | undefined} */
let cachedVitestRuleKeys;

/**
 * Every native `vitest/*` rule key from the installed oxlint schema.
 * Category-enabled Vitest rules activate globally with the plugin; Playwright
 * paths need an explicit off list (override `excludeFiles` only drops env/severity).
 * @returns {Record<string, "off">}
 */
function vitestRuleOffs() {
  if (!cachedVitestRuleKeys) {
    const oxlintPkg = fileURLToPath(import.meta.resolve("oxlint/package.json"));
    const schema = readFileSync(join(dirname(oxlintPkg), "configuration_schema.json"), "utf8");
    cachedVitestRuleKeys = [
      ...new Set([...schema.matchAll(/"(vitest\/[^"]+)"/g)].map((match) => match[1])),
    ];
    if (cachedVitestRuleKeys.length === 0) {
      throw new Error("oxlint configuration_schema.json: no vitest/* rules found");
    }
  }
  /** @type {Record<string, "off">} */
  const offs = {};
  for (const key of cachedVitestRuleKeys) {
    offs[key] = "off";
  }
  return offs;
}

/**
 * @typedef {{ modulesPath: string }} ModuleBoundaries
 * @typedef {{ react?: boolean, vitest?: boolean, astro?: boolean, moduleBoundaries?: ModuleBoundaries }} Features
 */

function escapeGlob(value) {
  return value.replace(/[?*+@!()[\]{}]/g, "\\$&");
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function testImportPatterns() {
  return [
    {
      group: [
        "**/tests/**",
        "**/#tests/**",
        "**/__tests__/**",
        // bare + extensioned (e.g. ./foo.test, ./foo.test.ts)
        "**/*.test",
        "**/*.test.*",
        "**/*.spec",
        "**/*.spec.*",
      ],
      message: "Do not import test files in source files",
    },
  ];
}

/**
 * @param {ModuleBoundaries} options
 */
function buildModuleBoundaries(options) {
  if (!options || typeof options.modulesPath !== "string") {
    throw new Error("moduleBoundaries.modulesPath must be a #/ alias path");
  }

  const modulesPath = options.modulesPath.replaceAll("\\", "/");
  const pathParts = modulesPath.split("/");
  if (
    pathParts[0] !== "#" ||
    pathParts.length < 2 ||
    pathParts.some((part, index) => index > 0 && (part === "" || part === "." || part === ".."))
  ) {
    throw new Error("moduleBoundaries.modulesPath must be a #/ alias path");
  }

  const filesystemPath = pathParts.slice(1).join("/");
  const modulesRoot = resolve(process.cwd(), filesystemPath);
  if (!statSync(modulesRoot, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Module boundaries directory does not exist: ${modulesRoot}`);
  }

  const moduleNames = readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
  const escapedModulesPath = pathParts.map(escapeGlob).join("/");
  const publicImportGroups = new Map(
    moduleNames.map((moduleName) => {
      const escapedModule = escapeGlob(moduleName);
      const entrypoint = `${escapedModulesPath}/${escapedModule}/${escapedModule}`;
      return [
        moduleName,
        [
          `${escapedModulesPath}/${escapedModule}`,
          `${escapedModulesPath}/${escapedModule}/**`,
          `!${entrypoint}`,
          `!${entrypoint}.server`,
          ...sourceExtensions.flatMap((extension) => [
            `!${entrypoint}.${extension}`,
            `!${entrypoint}.server.${extension}`,
          ]),
        ],
      ];
    }),
  );
  const restrictedPatterns = (names) => {
    const allowedNames = moduleNames
      .filter((name) => !names.includes(name))
      .map(escapeRegex)
      .join("|");
    const allowedModuleNonCanonical =
      allowedNames === "" ? "" : `|(?:${allowedNames})/(?:/|.*//|(?:[^/]*/)*\\.{1,2}(?:/|$))`;
    return [
      {
        regex: `^${escapeRegex(modulesPath)}/(?:/|\\.{1,2}(?:/|$)${allowedModuleNonCanonical})`,
        message: "Use canonical module aliases",
      },
      ...names.map((name) => ({
        group: publicImportGroups.get(name),
        message: "Import modules through their public entrypoints",
      })),
    ];
  };
  const escapedFilesystemPath = filesystemPath.split("/").map(escapeGlob).join("/");
  const moduleGlobs = moduleNames.map(
    (moduleName) => `${escapedFilesystemPath}/${escapeGlob(moduleName)}/**`,
  );
  const boundaryContexts = [
    {
      files: moduleBoundaryGlobs,
      sourceFiles: sourceGlobs,
      excludeFiles: moduleGlobs,
      moduleNames,
    },
    ...moduleNames.map((moduleName) => {
      const modulePath = `${escapedFilesystemPath}/${escapeGlob(moduleName)}`;
      return {
        files: [`${modulePath}/**`],
        sourceFiles: [`${modulePath}/**/*.{${sourceExtensions.join(",")}}`],
        excludeFiles: [],
        moduleNames: moduleNames.filter((name) => name !== moduleName),
      };
    }),
  ];

  return {
    jsPlugins: [moduleBoundariesPlugin],
    rules: {
      "module-boundaries/no-relative-module-imports": ["error", { modulesRoot, moduleNames }],
    },
    overrides: boundaryContexts.flatMap(
      ({ files, sourceFiles, excludeFiles, moduleNames: restrictedNames }) => [
        {
          files,
          excludeFiles,
          rules: {
            "no-restricted-imports": ["error", { patterns: restrictedPatterns(restrictedNames) }],
          },
        },
        {
          files: sourceFiles,
          excludeFiles: [...excludeFiles, ...testGlobs, ...playwrightGlobs],
          rules: {
            "no-restricted-imports": [
              "error",
              { patterns: [...testImportPatterns(), ...restrictedPatterns(restrictedNames)] },
            ],
          },
        },
      ],
    ),
  };
}

/**
 * @param {Features} [features]
 */
function resolveFeatures(features = {}) {
  return {
    react: features.react ?? has("react"),
    vitest: features.vitest ?? has("vitest"),
    astro: features.astro ?? has("astro"),
  };
}

/**
 * @param {Features} [featureFlags]
 */
function buildBaseConfig(featureFlags) {
  const { react: hasReact, vitest: hasVitest, astro: hasAstro } = resolveFeatures(featureFlags);

  const moduleBoundaries = featureFlags?.moduleBoundaries
    ? buildModuleBoundaries(featureFlags.moduleBoundaries)
    : undefined;

  /** @type {string[]} */
  const plugins = ["eslint", "typescript", "unicorn", "oxc", "import"];
  if (hasReact) {
    plugins.push("react", "jsx-a11y");
  }
  if (hasVitest) {
    plugins.push("vitest");
  }

  /** @type {Record<string, unknown>} */
  const rules = {
    "import/no-duplicates": ["warn", { preferInline: true }],
    "import/no-unassigned-import": "off",

    // High-signal TS tweaks; prefer Oxlint defaults otherwise
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter",
      },
    ],
    "typescript/no-import-type-side-effects": "error",
    "typescript/no-floating-promises": ["error", { ignoreIIFE: true }],
    "typescript/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/unbound-method": "off",
    "typescript/ban-ts-comment": "off",
    "typescript/consistent-type-definitions": "off",
  };

  if (hasReact) {
    Object.assign(rules, {
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
      "react/capitalized-calls": "error",
      "react/error-boundaries": "error",
      "react/exhaustive-effect-dependencies": "error",
      "react/globals": "error",
      "react/hooks": "error",
      "react/immutability": "error",
      "react/incompatible-library": "error",
      "react/invariant": "error",
      "react/memo-dependencies": "error",
      "react/no-deriving-state-in-effects": "error",
      "react/preserve-manual-memoization": "error",
      "react/purity": "error",
      "react/refs": "error",
      "react/rule-suppression": "error",
      "react/set-state-in-effect": "error",
      "react/set-state-in-render": "error",
      "react/static-components": "error",
      "react/syntax": "error",
      "react/todo": "error",
      "react/unsupported-syntax": "error",
      "react/use-memo": "error",
      "react/void-use-memo": "error",
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",
          unnamedComponents: "arrow-function",
        },
      ],
      "react/react-in-jsx-scope": "off",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          assert: "either",
        },
      ],
      "jsx-a11y/prefer-tag-over-role": "off",
    });
  }

  /** @type {import("oxlint").OxlintConfig["overrides"]} */
  const overrides = [
    {
      // Source files must not import test files
      files: sourceGlobs,
      excludeFiles: [...testGlobs, ...playwrightGlobs],
      rules: {
        "no-restricted-imports": ["error", { patterns: testImportPatterns() }],
      },
    },
  ];

  if (hasVitest) {
    overrides.push({
      files: [...testGlobs],
      excludeFiles: [...playwrightTestGlobs],
      env: {
        vitest: true,
      },
      rules: {
        "vitest/no-focused-tests": "warn",
      },
    });
    // Categories enable vitest/* globally once the plugin is on; turn them all
    // off under Playwright paths (excludeFiles on the Vitest override is not enough).
    overrides.push({
      files: [...playwrightGlobs],
      rules: vitestRuleOffs(),
    });
  }

  if (hasReact) {
    overrides.push({
      // Playwright specs aren't React components/hooks consumers
      files: [...playwrightGlobs],
      rules: {
        "react/rules-of-hooks": "off",
        "react/exhaustive-deps": "off",
        "react/capitalized-calls": "off",
        "react/error-boundaries": "off",
        "react/exhaustive-effect-dependencies": "off",
        "react/globals": "off",
        "react/hooks": "off",
        "react/immutability": "off",
        "react/incompatible-library": "off",
        "react/invariant": "off",
        "react/memo-dependencies": "off",
        "react/no-deriving-state-in-effects": "off",
        "react/preserve-manual-memoization": "off",
        "react/purity": "off",
        "react/refs": "off",
        "react/rule-suppression": "off",
        "react/set-state-in-effect": "off",
        "react/set-state-in-render": "off",
        "react/static-components": "off",
        "react/syntax": "off",
        "react/todo": "off",
        "react/unsupported-syntax": "off",
        "react/use-memo": "off",
        "react/void-use-memo": "off",
      },
    });
  }

  if (hasAstro) {
    overrides.push({
      // Oxlint lints .astro frontmatter + <script> only (no template rules).
      files: ["**/*.astro"],
      env: {
        astro: true,
      },
      rules: {
        // Make Astro globals meaningful; TS handles most .ts undef cases.
        "no-undef": "error",
      },
    });
  }

  return defineConfig({
    // Setting `plugins` replaces defaults — include the full desired set.
    plugins,
    jsPlugins: moduleBoundaries?.jsPlugins,
    options: {
      // Requires peer `oxlint-tsgolint`. Consumers may set `typeAware: false` to opt out.
      typeAware: true,
    },
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      "**/.astro/**",
      "**/.cache/**",
      "**/.react-router/**",
      "**/.next/**",
      "**/.vercel/**",
      "**/node_modules/**",
      "**/build/**",
      "**/public/build/**",
      "**/playwright-report/**",
      "**/playwright-results/**",
      "**/playwright/report/**",
      "**/playwright/results/**",
      "**/server-build/**",
      "**/dist/**",
      "**/coverage/**",
    ],
    rules: { ...rules, ...moduleBoundaries?.rules },
    overrides: [...overrides, ...(moduleBoundaries?.overrides ?? [])],
  });
}

/**
 * @param {import("oxlint").OxlintConfig} [config]
 * @param {Features} [features] Explicit feature flags; omit to auto-detect via package resolution.
 */
export function createConfig(config = {}, features) {
  const baseConfig = buildBaseConfig(features);
  return defineConfig({
    ...baseConfig,
    ...config,
    categories: { ...baseConfig.categories, ...config.categories },
    env: { ...baseConfig.env, ...config.env },
    globals: { ...baseConfig.globals, ...config.globals },
    ignorePatterns: [...baseConfig.ignorePatterns, ...(config.ignorePatterns ?? [])],
    jsPlugins: [...(baseConfig.jsPlugins ?? []), ...(config.jsPlugins ?? [])],
    options: { ...baseConfig.options, ...config.options },
    overrides: [...baseConfig.overrides, ...(config.overrides ?? [])],
    plugins: [...new Set([...baseConfig.plugins, ...(config.plugins ?? [])])],
    rules: { ...baseConfig.rules, ...config.rules },
    settings: { ...baseConfig.settings, ...config.settings },
  });
}
