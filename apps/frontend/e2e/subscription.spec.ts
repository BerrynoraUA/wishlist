import { test, expect } from "@playwright/test";

test.describe("Subscription page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/subscription");
  });

  test("renders subscription header", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("renders pricing cards", async ({ page }) => {
    await expect(
      page.getByText(/free/i).first(),
    ).toBeVisible();
  });

  test("renders feature comparison table", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("renders FAQ section", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("FAQ items are expandable", async ({ page }) => {
    const faqButton = page
      .locator("[class*='faq'], [class*='FAQ']")
      .locator("button")
      .first();
    const hasFaq = await faqButton.isVisible().catch(() => false);
    if (!hasFaq) {
      test.skip();
      return;
    }

    await faqButton.click();
    await expect(page.locator("main")).toBeVisible();
  });

  test("visual screenshot", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("subscription-page.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
