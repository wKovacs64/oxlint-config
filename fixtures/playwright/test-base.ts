/** Local stand-in for a Playwright custom-fixture re-export. */
export const test = Object.assign(
  (name: string, fn: () => unknown) => {
    void name;
    void fn;
  },
  {
    only(name: string, fn: () => unknown) {
      void name;
      void fn;
    },
  },
);

export const expect = (value: unknown) => {
  void value;
  return {
    toBeVisible() {},
    toBe(expected: unknown) {
      void expected;
    },
  };
};
