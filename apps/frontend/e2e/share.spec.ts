import { test, expect } from "@playwright/test";

test.describe("Share page", () => {
  test("shows invalid share link message when no token", async ({ page }) => {
    await page.goto("/share");
    await expect(page.getByText("Invalid share link.")).toBeVisible();
  });

  test("shows loading state with token", async ({ page }) => {
    await page.goto("/share?token=test-mock-token");
    // Mock server verifies and returns wishlist for any token
    await expect(
      page
        .getByText("Birthday Wishes 🎂")
        .or(page.getByText("Loading wishlist..."))
        .or(page.getByText("Loading...")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("renders shared wishlist content with valid mock token", async ({ page }) => {
    await page.goto("/share?token=mock-share-token-123");
    // Mock returns "Birthday Wishes 🎂" wishlist with items
    await expect(page.getByText("Birthday Wishes 🎂")).toBeVisible({ timeout: 15_000 });
  });

  test("visual screenshot — shared wishlist", async ({ page }) => {
    await page.goto("/share?token=mock-share-token-123");
    await expect(page.getByText("Birthday Wishes 🎂")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("share-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
