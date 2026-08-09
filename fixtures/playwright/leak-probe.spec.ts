// Bare Playwright-path probe: triggers category Vitest rules when they leak.
test.only("focused", () => {});

test("no assertions", () => {});

// test("commented out")
