import { test, expect } from "@playwright/test";
import {
  getCssVar,
  getDataTheme,
  LIGHT_THEME,
  DARK_THEME,
} from "./helpers/theme";

test.describe("Theme & color system", () => {
  // Serialise because theme tests share mutable server state
  test.describe.configure({ mode: "serial" });

  test.describe("Light / Dark mode", () => {
    test("default theme sets data-theme on html element", async ({ page }) => {
      await page.goto("/home");
      const theme = await getDataTheme(page);
      expect(theme).toMatch(/^(light|dark)$/);
    });

    test("light mode has correct CSS variables", async ({ page }) => {
      // Force light mode via cookie before navigation
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "light",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "light",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/home");
      await page.waitForLoadState("domcontentloaded");

      const theme = await getDataTheme(page);
      expect(theme).toBe("light");
    });

    test("dark mode has correct CSS variables", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/home");
      await page.waitForLoadState("domcontentloaded");

      const theme = await getDataTheme(page);
      expect(theme).toBe("dark");
    });

    test("ThemeToggle button switches theme", async ({ page }) => {
      // Start with a known theme state
      await page.context().addCookies([
        { name: "bn_theme", value: "light", url: "http://localhost:3000" },
        { name: "bn_resolved_theme", value: "light", url: "http://localhost:3000" },
      ]);
      await page.goto("/home");
      await page.waitForLoadState("domcontentloaded");

      // Click the theme toggle button
      const toggleBtn = page.getByRole("button", {
        name: /switch to (light|dark) mode/i,
      });
      await toggleBtn.click();

      // The optimistic update should change data-theme immediately
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
    });

    test("theme persists across page navigation", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/home");
      await page.waitForLoadState("domcontentloaded");

      const themeOnHome = await getDataTheme(page);
      expect(themeOnHome).toBe("dark");

      // Navigate to another page
      await page.goto("/friends");
      await page.waitForLoadState("domcontentloaded");

      const themeOnFriends = await getDataTheme(page);
      expect(themeOnFriends).toBe("dark");
    });

    test("visual comparison — light mode home", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "light",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "light",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/home");
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-light-home.png", {
        maxDiffPixelRatio: 0.05,
      });
    });

    test("visual comparison — dark mode home", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/home");
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-dark-home.png", {
        maxDiffPixelRatio: 0.05,
      });
    });

    test("visual comparison — light mode friends", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "light",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "light",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/friends");
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-light-friends.png", {
        maxDiffPixelRatio: 0.05,
      });
    });

    test("visual comparison — dark mode friends", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/friends");
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-dark-friends.png", {
        maxDiffPixelRatio: 0.05,
      });
    });

    test("visual comparison — light mode settings", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "light",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "light",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-light-settings.png", {
        maxDiffPixelRatio: 0.05,
      });
    });

    test("visual comparison — dark mode settings", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "bn_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
        {
          name: "bn_resolved_theme",
          value: "dark",
          url: "http://localhost:3000",
        },
      ]);
      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("theme-dark-settings.png", {
        maxDiffPixelRatio: 0.05,
      });
    });
  });

  test.describe("ThemeToggle button", () => {
    test("renders with correct aria-label", async ({ page }) => {
      await page.goto("/home");
      const toggleBtn = page.getByRole("button", {
        name: /switch to (light|dark) mode/i,
      });
      await expect(toggleBtn).toBeVisible();
    });

    test("after click, aria-label updates to opposite mode", async ({
      page,
    }) => {
      await page.goto("/home");

      const toggleBtn = page.getByRole("button", {
        name: /switch to (light|dark) mode/i,
      });
      await expect(toggleBtn).toBeVisible();

      // Read current label to know expected after toggle
      const initialLabel = await toggleBtn.getAttribute("aria-label");
      const expectedLabel = initialLabel?.includes("dark")
        ? "Switch to light mode"
        : "Switch to dark mode";

      await toggleBtn.click();

      // Use Playwright's auto-retrying assertion
      await expect(
        page.getByRole("button", { name: expectedLabel }),
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
