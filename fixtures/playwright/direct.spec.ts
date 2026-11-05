import { expect, test } from "@playwright/test";

test.only("focused playwright", async ({ page }) => {
  // test("commented-out-looking")
  await expect(page.getByText("ok")).toBeVisible();
});

test("no assertions", async ({ page }) => {
  await page.goto("/");
});
