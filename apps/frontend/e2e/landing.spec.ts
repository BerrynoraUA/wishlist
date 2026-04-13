import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero section with heading and CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Wishlists");
    await expect(page.getByRole("link", { name: "Start Your First Wishlist" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See How It Works" })).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How It Works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Discover" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Testimonials" })).toBeVisible();
  });

  test("Log In and Get Started buttons link to /login", async ({ page }) => {
    const logInLink = page.getByRole("link", { name: "Log In" }).first();
    await expect(logInLink).toHaveAttribute("href", "/login");

    const getStartedLink = page.getByRole("link", { name: "Get Started Free" }).first();
    await expect(getStartedLink).toHaveAttribute("href", "/login");
  });

  test("stats bar section exists with counter elements", async ({ page }) => {
    await expect(page.getByText("Wishlists Created")).toBeVisible();
    await expect(page.getByText("Gifts Tracked")).toBeVisible();
    await expect(page.getByText("Items Reserved")).toBeVisible();
    await expect(page.getByText("Happy Gift-Givers")).toBeVisible();
  });

  test("features section renders all feature cards", async ({ page }) => {
    await expect(page.getByText("Beautiful Wishlists")).toBeVisible();
    await expect(page.getByText("Smart Link Scraping")).toBeVisible();
    await expect(page.getByText("Friends & Sharing")).toBeVisible();
    await expect(page.getByText("Gift Reservations")).toBeVisible();
  });

  test("hero badge is visible", async ({ page }) => {
    await expect(page.getByText("✨ Gifting, reimagined")).toBeVisible();
  });

  test("free forever note is visible", async ({ page }) => {
    await expect(page.getByText("Free forever · No credit card required")).toBeVisible();
  });

  test("mockup card previews are rendered", async ({ page }) => {
    await expect(page.getByText("Birthday Wishes 🎂")).toBeVisible();
    await expect(page.getByText("Wireless Headphones")).toBeVisible();
  });

  test("visual screenshot", async ({ page }) => {
    // Wait for animations to settle
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("landing-page.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
