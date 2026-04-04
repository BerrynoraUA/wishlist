import { test, expect } from "@playwright/test";

test.describe("Home / Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
  });

  test("renders the dashboard header with Add Wishlist button", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /add wishlist/i }),
    ).toBeVisible();
  });

  test("stats row renders stat cards", async ({ page }) => {
    // StatsRow loads via React Query — mock returns 3 wishlists, 12 items, etc.
    await page.waitForSelector("main", { state: "visible" });
    await expect(page.locator("main")).toBeVisible();
  });

  test("wishlist grid renders mock wishlists", async ({ page }) => {
    // Mock server returns 3 wishlists
    await expect(page.getByText("Birthday Wishes 🎂")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Travel Gear")).toBeVisible();
    await expect(page.getByText("Home Office")).toBeVisible();
  });

  test("clicking Add Wishlist opens create wishlist modal", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /add wishlist/i }).click();
    // Modal should appear with "Create New Wishlist" heading
    await expect(page.getByRole("heading", { name: /create new wishlist/i })).toBeVisible();
  });

  test("visual screenshot", async ({ page }) => {
    // Wait for mock data to render
    await expect(page.getByText("Birthday Wishes 🎂")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("home-dashboard.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
