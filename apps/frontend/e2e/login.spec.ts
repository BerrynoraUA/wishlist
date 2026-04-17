import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form with email and password fields", async ({ page }) => {
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows link to register page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Create one" })).toBeVisible();
  });

  test("shows validation error when submitting empty form", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email and password are required.")).toBeVisible();
  });

  test("Google sign-in button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });

  test("divider between Google and email form", async ({ page }) => {
    await expect(page.getByText("or", { exact: true }).first()).toBeVisible();
  });

  test("visual screenshot — login tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders register form with Create account button", async ({ page }) => {
    await expect(page.getByPlaceholder("you@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("shows link to login page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("shows validation error when submitting empty form", async ({ page }) => {
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Email and password are required.")).toBeVisible();
  });

  test("Google sign-in button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });

  test("visual screenshot — register tab", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page).toHaveScreenshot("register-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
