test("untyped mock", () => {
  const fn = vi.fn();
  expect(fn).toBeTypeOf("function");
});
