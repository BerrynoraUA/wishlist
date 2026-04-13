import { test, expect } from "@playwright/test";

test.describe("Secret Santa page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/secret-santa");
  });

  test("renders Secret Santa page heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /secret santa/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("renders New Event button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /new event/i })).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no events exist", async ({ page }) => {
    // Mock returns { items: [], total: 0 } so the grid shows empty state
    await expect(
      page
        .getByText(/no secret santa events/i)
        .or(page.getByText(/create one to get started/i))
        .or(page.getByText(/no events/i)),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking New Event opens CreateSecretSantaModal", async ({ page }) => {
    await page.getByRole("button", { name: /new event/i }).click();
    await expect(
      page
        .getByRole("heading", { name: /create secret santa/i })
        .or(page.getByRole("heading", { name: /new event/i })),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("CreateSecretSantaModal has a text input for event name", async ({ page }) => {
    await page.getByRole("button", { name: /new event/i }).click();
    // Wait for modal to open
    await page.waitForTimeout(300);
    const nameInput = page
      .locator('input[type="text"]')
      .or(page.locator("input").filter({ hasNot: page.locator('[type="number"]') }))
      .first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
  });

  test("CreateSecretSantaModal Cancel button closes the modal", async ({ page }) => {
    await page.getByRole("button", { name: /new event/i }).click();
    const modal = page.getByRole("heading", { name: /create secret santa|new event/i });
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("CreateSecretSantaModal closes on Escape key", async ({ page }) => {
    await page.getByRole("button", { name: /new event/i }).click();
    const modal = page.getByRole("heading", { name: /create secret santa|new event/i });
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("visual screenshot", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /secret santa/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("secret-santa-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
