import { expect, test, vi } from "vitest";

test("untyped mock", () => {
  const fn = vi.fn();
  expect(fn).toBeTypeOf("function");
});
