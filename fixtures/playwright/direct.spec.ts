import { expect, test } from "@playwright/test";

test.only("focused playwright", async ({ page }) => {
  // test("commented-out-looking")
  await expect(page.getByText("ok")).toBeVisible();
});

test("empty body stays valid playwright", async () => {});
