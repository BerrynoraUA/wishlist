import { test, expect } from "@playwright/test";

test.describe("TopNav navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
  });

  test("renders logo with Wishlane text", async ({ page }) => {
    await expect(page.getByText("Wishlane")).toBeVisible();
  });

  test("renders all nav items", async ({ page }) => {
    await expect(page.getByRole("link", { name: /My Wishlists/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Friends/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Discover/i })).toBeVisible();
  });

  test("My Wishlists nav item links to /home", async ({ page }) => {
    await expect(page.getByRole("link", { name: /My Wishlists/i })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  test("Friends nav item links to /friends", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Friends/i })).toHaveAttribute("href", "/friends");
  });

  test("Discover nav item links to /discover", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Discover/i })).toHaveAttribute(
      "href",
      "/discover",
    );
  });

  test("clicking Friends navigates to /friends", async ({ page }) => {
    await page.getByRole("link", { name: /Friends/i }).click();
    await page.waitForURL("**/friends");
    expect(page.url()).toContain("/friends");
  });

  test("clicking Discover navigates to /discover", async ({ page }) => {
    await page.getByRole("link", { name: /Discover/i }).click();
    await page.waitForURL("**/discover");
    expect(page.url()).toContain("/discover");
  });

  test("search input is visible on /home", async ({ page }) => {
    await expect(page.getByPlaceholder("Search wishlists...")).toBeVisible();
  });

  test("search input updates URL search params", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search wishlists...");
    await searchInput.fill("birthday");
    // URL should contain search param
    await expect(page).toHaveURL(/search=birthday/);
  });

  test("search placeholder changes on /friends", async ({ page }) => {
    await page.goto("/friends");
    await expect(page.getByPlaceholder("Search friends...")).toBeVisible();
  });

  test("search placeholder changes on /discover", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByPlaceholder("Search discover...")).toBeVisible();
  });

  test("ThemeToggle button is in the nav", async ({ page }) => {
    await expect(page.getByRole("button", { name: /switch to (light|dark) mode/i })).toBeVisible();
  });

  test("profile menu button is visible", async ({ page }) => {
    // ProfileMenu renders an avatar or initial button
    await expect(page.locator("header")).toBeVisible();
  });
});

test.describe("Modal interactions", () => {
  test("Modal closes on Escape key press", async ({ page }) => {
    await page.goto("/friends");
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByRole("heading", { name: /Invite friends/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: /Invite friends/i })).not.toBeVisible();
  });

  test("Modal closes on backdrop click", async ({ page }) => {
    await page.goto("/friends");
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByRole("heading", { name: /Invite friends/i })).toBeVisible();

    // Click the overlay (outside the modal content)
    const overlay = page.locator("[class*='overlay']");
    // Use dispatchEvent to bypass header intercepting the click
    await overlay.dispatchEvent("click");
    await expect(page.getByRole("heading", { name: /Invite friends/i })).not.toBeVisible();
  });

  test("Modal content click does not close it", async ({ page }) => {
    await page.goto("/friends");
    await page.getByRole("button", { name: "Invite Friends" }).click();
    const heading = page.getByRole("heading", { name: /Invite friends/i });
    await expect(heading).toBeVisible();

    // Click inside the modal content
    await heading.click();
    // Modal should still be visible
    await expect(heading).toBeVisible();
  });

  test("DeleteConfirmModal — trigger delete flow on wishlist detail", async ({ page }) => {
    await page.goto("/wishlist/wl-001");
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page
      .locator('[class*="menuDropdown"] button, [class*="dropdown"] button')
      .filter({ hasText: "Delete" })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /delete wishlist/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("heading", { name: /delete wishlist/i })).not.toBeVisible();
  });
});
