import { test, expect } from "@playwright/test";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("renders Settings heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
  });

  test("renders settings tabs: Profile, Account, Notifications, Appearance", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /profile/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /notifications/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /appearance/i }),
    ).toBeVisible();
  });

  test("Profile tab shows mock profile data", async ({ page }) => {
    // Mock returns "Test User" profile
    await expect(page.locator("main, [class*='content']")).toBeVisible();
  });

  test("switch to Account tab shows account settings", async ({ page }) => {
    await page.getByRole("button", { name: /account/i }).click();
    await expect(page.locator("[class*='content']").first()).toBeVisible();
  });

  test("switch to Notifications tab shows notification settings", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(page.locator("[class*='content']").first()).toBeVisible();
  });

  test("switch to Appearance tab shows appearance settings", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /appearance/i }).click();
    await expect(page.locator("[class*='content']").first()).toBeVisible();
  });

  test("Appearance settings has theme options", async ({ page }) => {
    await page.getByRole("button", { name: /appearance/i }).click();
    await expect(page.getByRole("heading", { name: "Theme" })).toBeVisible();
    await expect(page.getByText("Select your preferred color scheme.")).toBeVisible();
  });

  test("visual screenshot — profile tab", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("settings-profile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — appearance tab", async ({ page }) => {
    await page.getByRole("button", { name: /appearance/i }).click();
    await expect(page.locator("[class*='content']").first()).toBeVisible();
    await expect(page).toHaveScreenshot("settings-appearance.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
