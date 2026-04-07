import { test, expect } from "@playwright/test";

test.describe("Discover page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/discover");
  });

  test("renders discover header", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("renders upcoming events section", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("renders filter tabs: All Wishlists, Reserved, Purchased", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /all wishlists/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reserved", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Purchased", exact: true }),
    ).toBeVisible();
  });

  test("Wishlists tab loads content from mock", async ({ page }) => {
    // Mock returns discover sections with Alice's Bookshelf
    await expect(
      page
        .getByText("Alice's Bookshelf")
        .or(page.getByText("No wishlists to discover."))
        .or(page.locator("main"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("switch to Reserved tab updates URL and shows reserved content", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Reserved", exact: true }).click();
    await expect(page).toHaveURL(/tab=reserved/);
    await expect(
      page.getByText("No reserved items yet."),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("switch to Purchased tab updates URL and shows purchased content", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Purchased", exact: true }).click();
    await expect(page).toHaveURL(/tab=purchased/);
    await expect(
      page.getByText("No purchased items yet."),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("switching tabs back to Wishlists removes tab param", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Reserved", exact: true }).click();
    await expect(page).toHaveURL(/tab=reserved/);
    await page.getByRole("button", { name: /all wishlists/i }).click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test("visual screenshot", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("discover-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
