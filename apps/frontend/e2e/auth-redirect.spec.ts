import { test, expect } from "@playwright/test";

/**
 * Auth redirect tests verify the Supabase SSR middleware authentication guard.
 *
 * Unauthenticated blocks override storageState to empty cookies (same technique
 * used by responsive.spec.ts). Authenticated blocks use the default
 * project storageState (e2e/.auth/user.json) set by global-setup.ts.
 */

test.describe("Auth redirects — unauthenticated user", () => {
  // Override the inherited auth storage state — no session cookies
  test.use({ storageState: { cookies: [], origins: [] } });

  test("accessing /home without auth redirects to /login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("redirect to /home includes redirect_to param", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/redirect_to/);
    expect(decodeURIComponent(page.url())).toContain("/home");
  });

  test("accessing /friends without auth redirects to /login", async ({ page }) => {
    await page.goto("/friends");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("accessing /secret-santa without auth redirects to /login", async ({ page }) => {
    await page.goto("/secret-santa");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("accessing /settings without auth redirects to /login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("accessing /discover without auth redirects to /login", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("/share route is NOT redirected — middleware skips it", async ({ page }) => {
    await page.goto("/share");
    await page.waitForLoadState("domcontentloaded");
    // Should NOT end up on /login
    expect(page.url()).not.toContain("/login");
    // The share page shows an error when no token is present
    await expect(page.getByText("Invalid share link.")).toBeVisible({ timeout: 10_000 });
  });

  test("/login is accessible without auth", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 10_000 });
  });

  test("/ (landing) is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Auth redirects — authenticated user", () => {
  // Uses the default project storageState (e2e/.auth/user.json)

  test("authenticated user visiting /login is redirected to /home", async ({ page }) => {
    await page.goto("/login");
    await page.waitForURL(/\/home/, { timeout: 10_000 });
    expect(page.url()).toContain("/home");
  });

  test("authenticated user visiting / is redirected to /home", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/home/, { timeout: 10_000 });
    expect(page.url()).toContain("/home");
  });
});
