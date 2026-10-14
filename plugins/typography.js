const typographicQuotes = /[\u2018\u2019\u201c\u201d]/u;

export default {
  meta: {
    name: "typography",
  },
  rules: {
    "no-typographic-quotes": {
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
        function check(node, value) {
          if (typeof value === "string" && typographicQuotes.test(value)) {
            context.report({ node, messageId: "useStraightQuotes" });
          }
        }

        return {
          Literal: (node) => check(node, node.value),
          JSXText: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
        };
      },
    },
  },
};
