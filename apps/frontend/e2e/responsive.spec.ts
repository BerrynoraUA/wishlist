import { test, expect } from "@playwright/test";

const MOBILE = { width: 375, height: 812 }; // iPhone-like
const DESKTOP = { width: 1280, height: 800 };

test.describe("Responsive — Mobile viewport", () => {
  test.use({ viewport: MOBILE, storageState: { cookies: [], origins: [] } });

  test("landing page renders on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Wishlists",
    );
  });

  test("landing page has burger menu on mobile", async ({ page }) => {
    await page.goto("/");
    const burger = page.getByRole("button", { name: /open menu/i });
    await expect(burger).toBeVisible();
  });

  test("login page responsive", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("visual screenshot — landing mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("responsive-landing-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — login mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveScreenshot("responsive-login-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe("Responsive — Mobile viewport (authenticated)", () => {
  test.use({ viewport: MOBILE });

  test("home page renders on mobile", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("main")).toBeVisible();
  });

  test("friends page renders on mobile", async ({ page }) => {
    await page.goto("/friends");
    await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
  });

  test("settings page renders on mobile", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
  });

  test("visual screenshot — home mobile", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-home-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — friends mobile", async ({ page }) => {
    await page.goto("/friends");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-friends-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — settings mobile", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-settings-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — subscription mobile", async ({ page }) => {
    await page.goto("/subscription");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-subscription-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe("Responsive — Desktop viewport", () => {
  test.use({ viewport: DESKTOP });

  test.describe("anonymous", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("visual screenshot — landing desktop", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot("responsive-landing-desktop.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });
  });

  test("visual screenshot — home desktop", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-home-desktop.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — friends desktop", async ({ page }) => {
    await page.goto("/friends");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-friends-desktop.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("visual screenshot — discover desktop", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("responsive-discover-desktop.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
