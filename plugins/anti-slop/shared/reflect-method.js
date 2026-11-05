// Vendored from dmmulroy/anti-slop@13909c9e07590f5a85d93c62712259fe14a883f7 src/shared/reflect-method.ts by scripts/vendor-anti-slop.mjs.
import { resolveVariable } from "./scope.js";

function isGlobalReflect(sourceCode, expression) {
  if (expression.type !== "Identifier" || expression.name !== "Reflect") return false;
  if (sourceCode.isGlobalReference(expression)) return true;
  const variable = resolveVariable(sourceCode, expression);
  return variable === null || variable.defs.length === 0;
}

/** Reports whether a call target names one method on the global Reflect object. */
export function isGlobalReflectMethodCall(sourceCode, callee, methodName) {
  if (!("property" in callee) || !("object" in callee) || !("computed" in callee)) return false;
  if (!isGlobalReflect(sourceCode, callee.object)) return false;
  const property = callee.property;
  return callee.computed
    ? property.type === "Literal" && property.value === methodName
    : property.type === "Identifier" && property.name === methodName;
}
