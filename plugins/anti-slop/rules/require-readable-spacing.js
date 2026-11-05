// Vendored from dmmulroy/anti-slop@13909c9e07590f5a85d93c62712259fe14a883f7 src/rules/require-readable-spacing.ts by scripts/vendor-anti-slop.mjs.

import createPaddingLineRule from "../vendor/eslint-stylistic/padding-line-between-statements.js";

/** A `const`/`let`/`var`/`using` declaration, optionally exported, written on one line. */
function isSinglelineBinding(node) {
  const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
  return declaration?.type === "VariableDeclaration" && node.loc.start.line === node.loc.end.line;
}

/** Comments above a statement belong to it; a comment trailing the previous line does not. */
function hasLeadingComment(node, sourceCode) {
  const previousLine = sourceCode.getTokenBefore(node)?.loc.end.line;
  return sourceCode
    .getCommentsBefore(node)
    .some((comment) => comment.loc.start.line !== previousLine);
}

const singlelineBinding = {
  test: (node) => isSinglelineBinding(node),
};

const undocumentedSinglelineBinding = {
  test: (node, sourceCode) => isSinglelineBinding(node) && !hasLeadingComment(node, sourceCode),
};

const paddingRule = createPaddingLineRule(
  [
    { blankLine: "always", prev: "import", next: "*" },
    { blankLine: "always", prev: "*", next: { selector: "Program > :not(ImportDeclaration)" } },
    { blankLine: "always", prev: { selector: "Program > :not(ImportDeclaration)" }, next: "*" },
    { blankLine: "always", prev: "*", next: ["function", "class", "interface", "type"] },
    { blankLine: "always", prev: ["function", "class", "interface", "type"], next: "*" },
    {
      blankLine: "always",
      prev: "*",
      next: ["multiline-const", "multiline-let", "multiline-var", "multiline-using"],
    },
    {
      blankLine: "always",
      prev: ["multiline-const", "multiline-let", "multiline-var", "multiline-using"],
      next: "*",
    },
    {
      blankLine: "always",
      prev: "*",
      next: ["return", "if", "switch", "try", "for", "while", "do"],
    },
    { blankLine: "always", prev: "block-like", next: "*" },
    { blankLine: "any", prev: "import", next: "import" },
    // Consecutive single-line bindings form one group at any scope, including
    // module scope. A binding with its own leading comment starts a new group.
    { blankLine: "any", prev: "singleline-binding", next: "undocumented-singleline-binding" },
    {
      blankLine: "any",
      prev: {
        selector:
          ':matches(TSDeclareFunction, ExportNamedDeclaration[declaration.type="TSDeclareFunction"])',
      },
      next: {
        selector:
          ':matches(TSDeclareFunction, FunctionDeclaration, ExportNamedDeclaration[declaration.type="TSDeclareFunction"], ExportNamedDeclaration[declaration.type="FunctionDeclaration"])',
      },
    },
  ],
  {
    "singleline-binding": singlelineBinding,
    "undocumented-singleline-binding": undocumentedSinglelineBinding,
  },
);

/** Restore structural blank lines with whitespace-only fixes; keep single-line binding groups and overloads grouped. */
export const requireReadableSpacingRule = {
  ...paddingRule,
  meta: {
    ...paddingRule.meta,
    docs: {
      description: "Require readable spacing between declarations and logical statement groups.",
    },
    schema: [],
  },
};
