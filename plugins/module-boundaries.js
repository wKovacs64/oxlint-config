import path from "node:path";
import { definePlugin, defineRule } from "@oxlint/plugins";
import { isRecord, isString } from "./guards.js";

/** @import { ESTree } from "@oxlint/plugins" */
/** @typedef {ESTree.ImportDeclaration | ESTree.ExportNamedDeclaration | ESTree.ExportAllDeclaration} ModuleSourceNode */

const relativeSpecifier = /^\.{1,2}(?:\/|$)/;
const parentSpecifier = /^\.\.(?:\/|$)/;

/**
 * @param {string} filename
 * @param {string} modulesRoot
 * @param {Set<string>} moduleNames
 */
function containingModule(filename, modulesRoot, moduleNames) {
  const relative = path.relative(modulesRoot, filename);

  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    return undefined;
  }

  const [moduleName] = relative.split(path.sep);

  return moduleName !== undefined && moduleNames.has(moduleName) ? moduleName : undefined;
}

const noRelativeModuleImports = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "require aliased public entrypoints for imports across module boundaries",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["modulesRoot", "moduleNames"],
        properties: {
          modulesRoot: { type: "string" },
          moduleNames: { type: "array", items: { type: "string" }, uniqueItems: true },
        },
      },
    ],
    messages: {
      usePublicAlias: "Import modules through their aliased public entrypoints.",
    },
  },
  create(context) {
    const [options] = context.options;

    if (
      !isRecord(options) ||
      !isString(options.modulesRoot) ||
      !Array.isArray(options.moduleNames) ||
      !options.moduleNames.every(isString)
    ) {
      throw new Error("no-relative-module-imports requires { modulesRoot, moduleNames } options");
    }

    const { modulesRoot } = options;
    const knownModules = new Set(options.moduleNames);

    const importerModule = containingModule(context.filename, modulesRoot, knownModules);

    /** @param {ModuleSourceNode} node */
    function checkSource(node) {
      if (node.source === null || !relativeSpecifier.test(node.source.value)) {
        return;
      }

      const specifier = node.source.value;

      const target = path.resolve(path.dirname(context.filename), specifier);
      const targetModule = containingModule(target, modulesRoot, knownModules);

      if (targetModule !== undefined && targetModule !== importerModule) {
        context.report({ node: node.source, messageId: "usePublicAlias" });
      }
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
    };
  },
});

// Static imports only: `#/` aliases do not resolve in dynamic `import()`, so `../` stays allowed
// there. Native `no-restricted-imports` also checks `import()` and cannot skip it.
const noParentImports = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: 'require `#/` aliases instead of "../" in static imports',
    },
    schema: [],
    messages: {
      useAlias: 'Use a #/ alias instead of "../".',
    },
  },
  create(context) {
    /** @param {ModuleSourceNode} node */
    function checkSource(node) {
      if (node.source !== null && parentSpecifier.test(node.source.value)) {
        context.report({ node: node.source, messageId: "useAlias" });
      }
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
    };
  },
});

export default definePlugin({
  meta: {
    name: "module-boundaries",
  },
  rules: {
    "no-parent-imports": noParentImports,
    "no-relative-module-imports": noRelativeModuleImports,
  },
});
