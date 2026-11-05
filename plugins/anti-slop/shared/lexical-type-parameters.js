// Vendored from dmmulroy/anti-slop@13909c9e07590f5a85d93c62712259fe14a883f7 src/shared/lexical-type-parameters.ts by scripts/vendor-anti-slop.mjs.

function isNode(value) {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function collectInferTypeParameterNames(node, visitorKeys, names) {
  if (node.type === "TSInferType") names.add(node.typeParameter.name.name);
  const record = node;
  for (const key of visitorKeys[node.type] ?? []) {
    const value = record[key];
    if (isNode(value)) {
      collectInferTypeParameterNames(value, visitorKeys, names);
      continue;
    }
    if (!Array.isArray(value)) continue;
    for (const child of value) {
      if (isNode(child)) collectInferTypeParameterNames(child, visitorKeys, names);
    }
  }
}

/** Collect type binders that are in scope at a node and can shadow module aliases. */
export function lexicalTypeParameterNames(node, visitorKeys) {
  const names = new Set();
  let descendant = node;
  let current = node;
  while (current !== null && current.type !== "Program") {
    if ("typeParameters" in current) {
      for (const parameter of current.typeParameters?.params ?? []) {
        names.add(parameter.name.name);
      }
    }
    if (
      current.type === "TSMappedType" &&
      (descendant === current.nameType || descendant === current.typeAnnotation)
    ) {
      names.add(current.key.name);
    }
    if (current.type === "TSConditionalType" && descendant === current.trueType) {
      collectInferTypeParameterNames(current.extendsType, visitorKeys, names);
    }
    descendant = current;
    current = current.parent;
  }
  return names;
}
