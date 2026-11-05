import { definePlugin, defineRule } from "@oxlint/plugins";

/** @import { ESTree } from "@oxlint/plugins" */

// `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, and the `oxlint-` forms.
const disableDirective = /^\s*(?:eslint|oxlint)-disable(?:-next-line|-line)?(?:\s|$)/u;

// ESLint's directive description syntax: `-- <reason>` after the rule list.
const disableReason = /\s--\s*\S/u;

// `IUser` but not `IPAddress` or `IDBRecord`.
const iPrefix = /^I[A-Z][a-z]/u;

/**
 * Matches typescript-eslint `naming-convention`'s `PascalCase` format.
 * @param {string} name
 */
function isPascalCase(name) {
  const first = name.charAt(0);

  return first === first.toUpperCase() && !name.includes("_");
}

export default definePlugin({
  meta: {
    name: "conventions",
  },
  rules: {
    // A disable directive is the escape hatch for a rule that is wrong about one spot. The reason
    // tells the reviewer what the author knows that the rule does not.
    "require-disable-reason": defineRule({
      meta: {
        type: "suggestion",
        docs: {
          description: "require a `-- reason` on lint disable directives",
        },
        schema: [],
        messages: {
          missingReason:
            "Explain why the rule is wrong here after `--`, e.g. `oxlint-disable-next-line <rule> -- <reason>`.",
        },
      },
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              if (disableDirective.test(comment.value) && !disableReason.test(comment.value)) {
                context.report({ node: comment, messageId: "missingReason" });
              }
            }
          },
        };
      },
    }),
    "type-name-casing": defineRule({
      meta: {
        type: "suggestion",
        docs: {
          description: "require PascalCase type names without an `I` prefix",
        },
        schema: [],
        messages: {
          pascalCase: "Type name `{{name}}` must be PascalCase.",
          iPrefix: "Type name `{{name}}` must not use an `I` prefix.",
        },
      },
      create(context) {
        /** @param {ESTree.BindingIdentifier | null} id */
        function check(id) {
          if (id === null) {
            return;
          }

          const { name } = id;

          if (!isPascalCase(name)) {
            context.report({ node: id, messageId: "pascalCase", data: { name } });
          } else if (iPrefix.test(name)) {
            context.report({ node: id, messageId: "iPrefix", data: { name } });
          }
        }

        return {
          ClassDeclaration: (node) => check(node.id),
          ClassExpression: (node) => check(node.id),
          TSInterfaceDeclaration: (node) => check(node.id),
          TSTypeAliasDeclaration: (node) => check(node.id),
          TSEnumDeclaration: (node) => check(node.id),
          TSTypeParameter: (node) => check(node.name),
        };
      },
    }),
  },
});
