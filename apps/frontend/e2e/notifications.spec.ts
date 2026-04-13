import { test, expect } from "@playwright/test";

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("header")).toBeVisible();
  });

  test("notification container is visible in the nav", async ({ page }) => {
    // NotificationsMenu renders with styles.notification CSS module class
    // [class*="notification"] matches the hashed CSS module class name
    const notifContainer = page.locator('[class*="notification"]').first();
    await expect(notifContainer).toBeVisible({ timeout: 10_000 });
  });

  test("unread badge is visible with count from mock data", async ({ page }) => {
    // Mock returns get_unread_notifications_count = 1
    const badge = page.locator('[class*="badge"]').first();
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toContainText("1");
  });

  test("clicking the bell opens the notifications panel", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    // NotificationsPanel renders with a "Notifications" heading
    await expect(page.getByText("Notifications").first()).toBeVisible({ timeout: 5_000 });
  });

  test("notifications panel shows first mock notification", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    // MOCK_NOTIFICATIONS[0]: sender "Alice Johnson", text "accepted your friend request"
    await expect(page.getByText("accepted your friend request")).toBeVisible({ timeout: 10_000 });
  });

  test("notifications panel shows second mock notification", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    // MOCK_NOTIFICATIONS[1]: sender "Bob Smith", text "reserved an item on your wishlist"
    await expect(page.getByText("reserved an item on your wishlist")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("notifications panel has Read all button", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    await expect(page.getByRole("button", { name: /read all/i })).toBeVisible({ timeout: 5_000 });
  });

  test("notifications panel has Clear button", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    await expect(page.getByRole("button", { name: /clear/i })).toBeVisible({ timeout: 5_000 });
  });

  test("unread notification item is visually distinct", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    // MOCK_NOTIFICATIONS[0] has is_read: false — gets CSS module "unread" class
    await expect(page.locator('[class*="unread"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicking outside the panel closes it", async ({ page }) => {
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    await expect(page.getByText("Notifications").first()).toBeVisible();

    // Click main content area to trigger outside-click handler
    await page.locator("main").click({ position: { x: 10, y: 10 } });

    // Panel should no longer be visible
    await expect(page.locator('[class*="panel"]').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("notifications panel is accessible from /friends page", async ({ page }) => {
    await page.goto("/friends");
    await expect(page.locator("header")).toBeVisible();
    const bell = page.locator('[class*="bell"]').first();
    await bell.click();
    await expect(page.getByText("Notifications").first()).toBeVisible({ timeout: 5_000 });
  });
});
