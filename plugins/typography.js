import { definePlugin, defineRule } from "@oxlint/plugins";
import { isString } from "./guards.js";

/** @import { ESTree } from "@oxlint/plugins" */

const typographicQuotes = /[‘’“”]/u;

export default definePlugin({
  meta: {
    name: "typography",
  },
  rules: {
    "no-typographic-quotes": defineRule({
      meta: {
        type: "suggestion",
        docs: {
          description: "require straight quotes in strings, JSX text, and template text",
        },
        schema: [],
        messages: {
          useStraightQuotes:
            "Use straight quotes (' \") instead of typographic quotes. In JSX children, escape with HTML entities.",
        },
      },
      create(context) {
        /**
         * @param {ESTree.Node} node
         * @param {unknown} value
         */
        function check(node, value) {
          if (isString(value) && typographicQuotes.test(value)) {
            context.report({ node, messageId: "useStraightQuotes" });
          }
        }

        return {
          Literal: (node) => check(node, node.value),
          JSXText: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
        };
      },
    }),
  },
});
