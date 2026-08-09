import path from "node:path";

const relativeSpecifier = /^\.{1,2}(?:\/|$)/;

function containingModule(filename, modulesRoot, moduleNames) {
  const relative = path.relative(modulesRoot, filename);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    return undefined;
  }

  const [moduleName] = relative.split(path.sep);
  return moduleNames.has(moduleName) ? moduleName : undefined;
}

const noRelativeModuleImports = {
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
    const [{ modulesRoot, moduleNames }] = context.options;
    const knownModules = new Set(moduleNames);
    const importerModule = containingModule(context.filename, modulesRoot, knownModules);

    function checkSource(node) {
      const specifier = node.source?.value;
      if (typeof specifier !== "string" || !relativeSpecifier.test(specifier)) {
        return;
      }

      const target = path.resolve(path.dirname(context.filename), specifier);
      const targetModule = containingModule(target, modulesRoot, knownModules);
      if (targetModule && targetModule !== importerModule) {
        context.report({ node: node.source, messageId: "usePublicAlias" });
      }
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
    };
  },
};

export default {
  meta: {
    name: "module-boundaries",
  },
  rules: {
    "no-relative-module-imports": noRelativeModuleImports,
  },
};
