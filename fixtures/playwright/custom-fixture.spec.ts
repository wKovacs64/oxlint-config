import { expect, test } from "./test-base.js";

test.only("focused via custom fixture", () => {
  // test("commented-out-looking")
  expect(true).toBe(true);
});

test("no assertions via custom fixture", () => {
  console.log("no assertions");
});
