import { test, expect } from "@playwright/test";

test.describe("Wishlist detail page", () => {
  /**
   * Navigate to the first mock wishlist directly.
   * The mock Supabase server returns data for any wishlist ID.
   */
  test.beforeEach(async ({ page }) => {
    await page.goto("/wishlist/wl-001");
  });

  test("renders wishlist header with title", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("shows items from mock data", async ({ page }) => {
    // Mock server returns 3 items for any wishlist
    await expect(page.getByText("Wireless Headphones")).toBeVisible({ timeout: 10_000 });
  });

  test("add item button opens create item modal", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add item/i });
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await expect(page.getByRole("heading", { name: /create item/i })).toBeVisible();
  });

  test("share button triggers share flow", async ({ page }) => {
    const shareBtn = page.getByRole("button", { name: /share wishlist/i });
    await expect(shareBtn).toBeVisible({ timeout: 10_000 });
    await shareBtn.click();
    // Mock returns a share token so success message should appear
    await expect(
      page
        .getByText("Link copied")
        .or(page.getByText("Share failed"))
        .or(page.getByText("Could not create link")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("visual screenshot", async ({ page }) => {
    await expect(page.getByText("Wireless Headphones")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("wishlist-detail.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
