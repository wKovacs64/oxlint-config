// Bare Playwright-path probe: triggers category Vitest rules when they leak.
test.only("focused", () => {
  console.log("focused");
});

test("no assertions", () => {
  console.log("no assertions");
});

// test("commented out")
