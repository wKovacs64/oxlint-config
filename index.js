import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import playwright from "eslint-plugin-playwright";
import { isRecord } from "./plugins/guards.js";

/** @import { DummyRuleMap, OxlintOverride } from "oxlint" */
/** @import { Config, ConfigOptions, Features, ModuleBoundaries } from "./index.js" */

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

const typographyPlugin = fileURLToPath(new URL("./plugins/typography.js", import.meta.url));
const conventionsPlugin = fileURLToPath(new URL("./plugins/conventions.js", import.meta.url));
const antiSlopPlugin = fileURLToPath(new URL("./plugins/anti-slop/index.js", import.meta.url));

const playwrightPlugin = {
  name: "playwright",
  specifier: fileURLToPath(import.meta.resolve("eslint-plugin-playwright")),
};

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

/**
 * @param {string[]} names
 * @param {"error" | "off"} severity
 */
function ruleSeverities(names, severity) {
  /** @type {DummyRuleMap} */
  const rules = {};

  for (const name of names) {
    rules[name] = severity;
  }

  return rules;
}

/** @type {string[] | undefined} */
let cachedRuleKeys;

/**
 * Every native rule key for `plugin` from the installed oxlint schema.
 * Category-enabled rules activate globally with their plugin, and an override
 * can't drop a plugin, so turning a plugin off somewhere needs an explicit off list.
 * @param {string} plugin
 */
function ruleOffs(plugin) {
  if (cachedRuleKeys === undefined) {
    const oxlintPkg = fileURLToPath(import.meta.resolve("oxlint/package.json"));

    /** @type {unknown} */
    const schema = JSON.parse(
      readFileSync(join(dirname(oxlintPkg), "configuration_schema.json"), "utf8"),
    );

    const rules =
      isRecord(schema) &&
      isRecord(schema.definitions) &&
      isRecord(schema.definitions.DummyRuleMap) &&
      isRecord(schema.definitions.DummyRuleMap.properties)
        ? schema.definitions.DummyRuleMap.properties
        : {};

    cachedRuleKeys = Object.keys(rules);
  }

  const keys = cachedRuleKeys.filter((key) => key.startsWith(`${plugin}/`));

  if (keys.length === 0) {
    throw new Error(`oxlint configuration_schema.json: no ${plugin}/* rules found`);
  }

  return ruleSeverities(keys, "off");
}

/**
 * `react` plugin checks that apply to any JSX rendering HTML.
 * @satisfies {DummyRuleMap}
 */
const jsxRules = {
  "react/jsx-key": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/jsx-no-undef": "error",
  "react/jsx-props-no-spread-multi": "error",
  "react/void-dom-elements-no-children": "error",
  "react/iframe-missing-sandbox": "error",
  "react/jsx-no-comment-textnodes": "error",
  "react/jsx-no-script-url": "error",
  // `>`, `}`, and quotes in JSX text usually mean a misplaced `>` turned attributes into text
  // (https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-unescaped-entities.md).
  "react/no-unescaped-entities": "error",
  // Browsers imply `noopener`; `noreferrer` also keeps the page's origin from the linked site.
  "react/jsx-no-target-blank": "error",
};

/** @satisfies {DummyRuleMap} */
const jsxA11yRules = {
  "jsx-a11y/label-has-associated-control": [
    "error",
    {
      assert: "either",
    },
  ],
  "jsx-a11y/prefer-tag-over-role": "off",
};

/**
 * Rules for every file, on top of the `correctness` and `suspicious` categories.
 * @satisfies {DummyRuleMap}
 */
const baseRules = {
  // Bug catchers outside `correctness`
  eqeqeq: "error",
  "no-unexpected-multiline": "error",
  "no-extend-native": "error",
  "array-callback-return": "error",
  "import/no-self-import": "error",
  "oxc/misrefactored-assign-op": "error",
  "unicorn/no-accessor-recursion": "error",
  "unicorn/no-array-fill-with-reference-type": "error",
  "unicorn/require-post-message-target-origin": "error",
  // `import "./styles.css"` and other side-effect imports are intentional.
  "import/no-unassigned-import": "off",
  // Underscores name module-private singletons and appear in fields of objects we do not own.
  "no-underscore-dangle": "off",
  // `as` is for when the code knows more than the type. Assertions instead need a `SAFETY:`
  // comment (`anti-slop/require-safety-comment-for-type-assertion`).
  "typescript/no-unsafe-type-assertion": "off",

  "no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
  "typography/no-typographic-quotes": "error",

  // Type-aware bug catchers outside `correctness`
  "typescript/no-floating-promises": [
    "error",
    {
      ignoreIIFE: true,
      allowForKnownSafeCalls: [
        // node:test runs these without awaiting the returned promise.
        { from: "package", package: "node:test", name: ["test", "it", "describe", "suite"] },
        // Remix `handle.update()` is called without awaiting in event handlers.
        { from: "package", package: "@remix-run/component", name: "update" },
      ],
    },
  ],
  "typescript/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
  "typescript/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
  // `no-explicit-any` stops written `any`. These stop the `any` that `JSON.parse`,
  // `Response.json()`, and untyped packages return from spreading through the code that uses it.
  "typescript/no-explicit-any": "error",
  "typescript/no-unsafe-argument": "error",
  "typescript/no-unsafe-assignment": "error",
  "typescript/no-unsafe-call": "error",
  "typescript/no-unsafe-member-access": "error",
  "typescript/no-unsafe-return": "error",
  "typescript/no-unsafe-function-type": "error",
  "typescript/use-unknown-in-catch-callback-variable": "error",
  "typescript/no-deprecated": "error",
  "typescript/only-throw-error": [
    "error",
    {
      // React Router loaders and actions throw `redirect()`, `Response`, and `data()`.
      allow: [
        { from: "lib", name: "Response" },
        { from: "package", package: "react-router", name: "DataWithResponseInit" },
      ],
      allowThrowingAny: false,
      allowThrowingUnknown: false,
    },
  ],
  "typescript/prefer-promise-reject-errors": "error",
  // `"Total: " + order` prints `[object Object]`; template literals make the conversion explicit.
  "typescript/restrict-plus-operands": [
    "error",
    {
      allowAny: false,
      allowBoolean: false,
      allowNullish: false,
      allowNumberAndString: false,
      allowRegExp: false,
    },
  ],
  // Method shorthand (`save(user: User): void`) is checked bivariantly even under
  // `strictFunctionTypes`; a function-typed property is not.
  "typescript/method-signature-style": ["error", "property"],
  // `{}` accepts any non-nullish value, not only empty objects.
  "typescript/no-empty-object-type": "error",
  "typescript/no-invalid-void-type": "error",
  "typescript/no-non-null-asserted-nullish-coalescing": "error",
  // Objects with keys that come and go belong in a `Map`.
  "typescript/no-dynamic-delete": "error",
  "typescript/no-require-imports": "error",
  "typescript/no-mixed-enums": "error",
  "typescript/related-getter-setter-pairs": "error",
  // `reduce<T>(fn, {})` instead of asserting the initial value with `{} as T`.
  "typescript/prefer-reduce-type-parameter": "error",
  // A promise returned unawaited inside `try` escapes its `catch` and `finally`.
  "typescript/return-await": ["error", "in-try-catch"],
  // `||` treats `0` as missing. Strings are exempt: `||` is right where `""` means missing
  // (`process.env.PORT || "8888"`) and `??` is right where it is data.
  "typescript/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
  // `{count && <Badge />}` renders `0`. A nullable string may be tested for truthiness: `if (!str)`
  // reads as "missing or empty".
  "typescript/strict-boolean-expressions": [
    "error",
    { allowNumber: false, allowNullableString: true },
  ],

  // Escape hatches carry their reason: `@ts-expect-error` needs a description, `@ts-ignore` and
  // `@ts-nocheck` are banned, and disable directives name their rules and say why.
  "typescript/ban-ts-comment": "error",
  "unicorn/no-abusive-eslint-disable": "error",
  "conventions/require-disable-reason": "error",

  // Consistency
  "import/no-duplicates": ["error", { preferInline: true }],
  "typescript/consistent-type-assertions": [
    "error",
    {
      assertionStyle: "as",
      objectLiteralTypeAssertions: "allow-as-parameter",
    },
  ],
  "typescript/no-import-type-side-effects": "error",
  "typescript/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
  // typescript-eslint's `stylistic` preset and `unified-signatures`. `consistent-type-definitions`
  // stays off: `type` and `interface` both have uses.
  "typescript/adjacent-overload-signatures": "error",
  "typescript/array-type": "error",
  "typescript/ban-tslint-comment": "error",
  "typescript/class-literal-property-style": "error",
  "typescript/consistent-generic-constructors": "error",
  "typescript/consistent-indexed-object-style": "error",
  "typescript/no-inferrable-types": "error",
  "typescript/prefer-for-of": "error",
  "typescript/prefer-function-type": "error",
  "typescript/unified-signatures": "error",
  "no-empty-function": "error",
  "conventions/type-name-casing": "error",
};

/**
 * Every generic rule from dmmulroy/anti-slop, plus the native rule its reducer rule complements.
 * @satisfies {DummyRuleMap}
 */
const antiSlopRules = {
  "oxc/no-accumulating-spread": "error",
  "anti-slop/no-array-filter-map": "error",
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reduce-accumulator-copy": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  // A type guard is where hand-written parsing narrows `unknown`.
  "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-readable-spacing": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
};

/**
 * `correctness` enables exhaustive-deps and the React Compiler's recommended rules.
 * @satisfies {DummyRuleMap}
 */
const reactRules = {
  "react/rules-of-hooks": "error",
  // React Compiler rules outside its recommended preset
  "react/capitalized-calls": "error",
  "react/exhaustive-effect-dependencies": "error",
  "react/invariant": "error",
  "react/memo-dependencies": "error",
  "react/no-deriving-state-in-effects": "error",
  "react/rule-suppression": "error",
  "react/syntax": "error",
  "react/todo": "error",
  "react/unsupported-syntax": "error",
  // Same check as `react/rules-of-hooks`, so each violation would report twice
  // (https://oxc.rs/docs/guide/usage/linter/rules/react/hooks).
  "react/hooks": "off",
  // Checks props against React DOM's names: `class` is `className` in React.
  "react/no-unknown-property": "error",
  // React DevTools and error stacks name components by `displayName`.
  "react/display-name": "error",
  "react/function-component-definition": [
    "error",
    {
      namedComponents: "function-declaration",
      unnamedComponents: "arrow-function",
    },
  ],
  "react/react-in-jsx-scope": "off",
};

/** @satisfies {DummyRuleMap} */
const vitestRules = {
  "vitest/no-focused-tests": "error",
  // Vitest's `expect(value, message)` takes a second argument.
  "vitest/valid-expect": ["error", { maxArgs: 2 }],
  // `expect*` covers `expectTypeOf` and shared helpers; type-level tests assert with `assertType`.
  "vitest/expect-expect": ["error", { assertFunctionNames: ["expect*", "assert", "assertType"] }],
  // `test.for` is not recognized when Vitest globals are used without an import.
  "vitest/no-standalone-expect": [
    "error",
    { additionalTestBlockFunctions: ["test.for", "it.for"] },
  ],
};

/**
 * eslint-plugin-playwright's recommended preset as errors: missing awaits, flaky waits, skipped
 * tests, and tests that cannot fail.
 */
const playwrightRules = ruleSeverities(
  Object.keys(playwright.configs["flat/recommended"].rules ?? {}).filter((rule) =>
    rule.startsWith("playwright/"),
  ),
  "error",
);

/** @param {string} value */
function escapeGlob(value) {
  return value.replace(/[?*+@!()[\]{}]/g, "\\$&");
}

/** @param {string} value */
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
 * @returns {{ jsPlugins: string[], rules: DummyRuleMap, overrides: OxlintOverride[] }}
 */
function buildModuleBoundaries(options) {
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

  if (statSync(modulesRoot, { throwIfNoEntry: false })?.isDirectory() !== true) {
    throw new Error(`Module boundaries directory does not exist: ${modulesRoot}`);
  }

  const moduleNames = readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();

  const escapedModulesPath = pathParts.map(escapeGlob).join("/");

  /** @param {string} moduleName */
  const publicImportGroup = (moduleName) => {
    const escapedModule = escapeGlob(moduleName);
    const entrypoint = `${escapedModulesPath}/${escapedModule}/${escapedModule}`;

    return [
      `${escapedModulesPath}/${escapedModule}`,
      `${escapedModulesPath}/${escapedModule}/**`,
      `!${entrypoint}`,
      `!${entrypoint}.server`,
      ...sourceExtensions.flatMap((extension) => [
        `!${entrypoint}.${extension}`,
        `!${entrypoint}.server.${extension}`,
      ]),
    ];
  };

  /** @param {string[]} names */
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
        group: publicImportGroup(name),
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
    overrides: [
      {
        // Outside modules, `../` climbs out of the current area of the app.
        files: moduleBoundaryGlobs,
        excludeFiles: moduleGlobs,
        rules: { "module-boundaries/no-parent-imports": "error" },
      },
      ...boundaryContexts.flatMap(
        /** @returns {OxlintOverride[]} */
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
    ],
  };
}

/**
 * @param {Features} [features]
 */
function resolveFeatures(features = {}) {
  return {
    react: features.react ?? has("react"),
    // `remix` exports types only from its root; its JSX runtime lives at `remix/component`.
    remix: features.remix ?? has("remix/component"),
    vitest: features.vitest ?? has("vitest"),
    playwright: features.playwright ?? has("@playwright/test"),
    astro: features.astro ?? has("astro"),
  };
}

/**
 * @param {Features} [featureFlags]
 * @returns {Config}
 */
function buildConfig(featureFlags) {
  const {
    react: hasReact,
    remix: hasRemix,
    vitest: hasVitest,
    playwright: hasPlaywright,
    astro: hasAstro,
  } = resolveFeatures(featureFlags);

  const moduleBoundaries =
    featureFlags?.moduleBoundaries === undefined
      ? undefined
      : buildModuleBoundaries(featureFlags.moduleBoundaries);

  /** @type {Config["plugins"]} */
  const plugins = ["eslint", "typescript", "unicorn", "oxc", "import"];
  const hasJsx = hasReact || hasRemix;

  if (hasJsx) {
    plugins.push("react", "jsx-a11y");
  }

  if (hasVitest) {
    plugins.push("vitest");
  }

  /** @type {DummyRuleMap} */
  const rules = {
    ...baseRules,
    ...antiSlopRules,
  };

  if (hasRemix && !hasReact) {
    // Categories would turn on hooks, React Compiler, and component rules.
    Object.assign(rules, ruleOffs("react"));
  }

  if (hasJsx) {
    Object.assign(rules, jsxRules, jsxA11yRules);
  }

  if (hasReact) {
    Object.assign(rules, reactRules);
  }

  /** @type {OxlintOverride[]} */
  const overrides = [
    {
      // Source files must not import test files
      files: sourceGlobs,
      excludeFiles: [...testGlobs, ...playwrightGlobs],
      rules: {
        "no-restricted-imports": ["error", { patterns: testImportPatterns() }],
      },
    },
    {
      files: [...testGlobs],
      rules: {
        // `expect(service.save).toHaveBeenCalled()` references a method without calling it.
        "typescript/unbound-method": "off",
        // Asymmetric matchers (`expect.any(String)`, `objectContaining()`) are typed `any` so they
        // fit any expected value. typescript-eslint turns the rule off for its own tests:
        // https://github.com/typescript-eslint/typescript-eslint/blob/72ad812d3c63/eslint.config.mjs#L372
        "typescript/no-unsafe-assignment": "off",
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
      rules: vitestRules,
    });
  }

  if (hasReact || hasVitest || hasPlaywright) {
    // Playwright fixtures call `use()` and destructure `{}`; neither is React or Vitest. Categories
    // enable a plugin's rules everywhere once it is on, so each is turned off here by name
    // (excludeFiles on the Vitest override is not enough).
    /** @type {DummyRuleMap} */
    const playwrightOffs = { "no-empty-pattern": "off" };

    if (hasReact) {
      Object.assign(playwrightOffs, ruleOffs("react"));
    }

    if (hasVitest) {
      Object.assign(playwrightOffs, ruleOffs("vitest"));
    }

    overrides.push({
      files: [...playwrightGlobs],
      rules: playwrightOffs,
    });
  }

  if (hasPlaywright) {
    overrides.push({
      files: [...playwrightTestGlobs],
      rules: playwrightRules,
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

  /** @type {Config["jsPlugins"]} */
  const jsPlugins = [typographyPlugin, conventionsPlugin, antiSlopPlugin];

  if (hasPlaywright) {
    jsPlugins.push(playwrightPlugin);
  }

  if (moduleBoundaries !== undefined) {
    jsPlugins.push(...moduleBoundaries.jsPlugins);
    Object.assign(rules, moduleBoundaries.rules);
    overrides.push(...moduleBoundaries.overrides);
  }

  return {
    // Setting `plugins` replaces defaults — include the full desired set.
    plugins,
    jsPlugins,
    options: {
      // Requires peer `oxlint-tsgolint`. Consumers may set `typeAware: false` to opt out.
      typeAware: true,
      reportUnusedDisableDirectives: "error",
    },
    // Warnings do not fail CI, so they get ignored; every enabled rule is an error.
    categories: {
      correctness: "error",
      suspicious: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      // Agent and editor tooling, not project code
      "**/.agent/**",
      "**/.agents/**",
      "**/.claude/**",
      "**/.codex/**",
      "**/.cursor/**",
      "**/.impeccable/**",
      "**/.opencode/**",
      "**/.pi/**",
      "**/.pnpm-store/**",
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
    globals: {},
    rules,
    overrides,
    settings: {},
  };
}

/**
 * @param {ConfigOptions} [config]
 * @param {Features} [features] Explicit feature flags; omit to auto-detect via package resolution.
 * @returns {Config}
 */
export function createConfig(config = {}, features) {
  const baseConfig = buildConfig(features);

  return {
    ...baseConfig,
    ...config,
    categories: { ...baseConfig.categories, ...config.categories },
    env: { ...baseConfig.env, ...config.env },
    globals: { ...baseConfig.globals, ...config.globals },
    ignorePatterns: [...baseConfig.ignorePatterns, ...(config.ignorePatterns ?? [])],
    jsPlugins: [...baseConfig.jsPlugins, ...(config.jsPlugins ?? [])],
    options: { ...baseConfig.options, ...config.options },
    overrides: [...baseConfig.overrides, ...(config.overrides ?? [])],
    plugins: [...new Set([...baseConfig.plugins, ...(config.plugins ?? [])])],
    rules: { ...baseConfig.rules, ...config.rules },
    settings: { ...baseConfig.settings, ...config.settings },
  };
}
