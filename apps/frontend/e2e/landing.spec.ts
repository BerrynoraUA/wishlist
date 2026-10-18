import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero section with heading and CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyone's in on it.");
    await expect(
      page.getByRole("link", { name: "Start Your First Wishlist" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "See How It Works" })).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How It Works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
  });

  test("Log In and Get Started buttons link to auth pages", async ({ page }) => {
    const logInLink = page.getByRole("link", { name: "Log In" }).first();
    await expect(logInLink).toHaveAttribute("href", "/login");

    const getStartedLink = page.getByRole("link", { name: "Get Started Free" }).first();
    await expect(getStartedLink).toHaveAttribute("href", "/register");
  });

  test("features section lists the product features", async ({ page }) => {
    await expect(page.getByText("Paste any link")).toBeVisible();
    await expect(page.getByText("You pick who sees it")).toBeVisible();
    await expect(page.getByText("Friends by link or username")).toBeVisible();
  });

  test("free forever note is visible", async ({ page }) => {
    await expect(page.getByText("Free forever. No credit card required.").first()).toBeVisible();
  });

  test("hero demo reserves an item and hides reservations from the owner", async ({ page }) => {
    const hero = page.locator("header");
    await expect(hero.getByText("Maya's 30th")).toBeVisible();

    const reserve = hero.getByRole("button", { name: "Reserve", exact: true }).first();
    await reserve.click();
    await expect(hero.getByRole("button", { name: "Reserved", exact: true })).toHaveCount(2);

    await hero.getByRole("button", { name: "Maya sees" }).click();
    await expect(hero.getByRole("button", { name: "Reserved", exact: true })).toHaveCount(0);
    await expect(hero.getByText("Can't tell. That's the point.").first()).toBeVisible();
  });

  test("visual screenshot", async ({ page }) => {
    // Wait for entry animations to settle
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("landing-page.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
