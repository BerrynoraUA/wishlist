import { test, expect } from "@playwright/test";

test.describe("Wishlist CRUD interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/wishlist/wl-001");
    // Mock returns 3 items; wait for the first to confirm data is loaded
    await expect(page.getByText("Wireless Headphones")).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── Item menu ────────────────────────────────────────────────────────────

  test("owner sees Open item menu button on each card", async ({ page }) => {
    // WishlistItemCard renders aria-label="Open item menu" only when isOwner=true
    // Mock wishlist has is_owner: true for the test user
    await expect(
      page.getByRole("button", { name: "Open item menu" }).first(),
    ).toBeVisible();
  });

  test("clicking item menu button opens dropdown with Edit and Delete", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    // Dropdown renders plain <button><span>Edit</span></button> buttons
    await expect(page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first()).toBeVisible();
    await expect(page.locator('[class*="dropdown"] button').filter({ hasText: "Delete" }).first()).toBeVisible();
  });

  // ── Edit Item ────────────────────────────────────────────────────────────

  test("clicking Edit in item dropdown opens EditItemModal", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(
      page.getByRole("heading", { name: /edit item/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("EditItemModal pre-populates the item name field", async ({ page }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(page.getByRole("heading", { name: /edit item/i })).toBeVisible({ timeout: 5_000 });
    // First item in mock data is "Wireless Headphones"
    const nameInput = page.locator('input[placeholder*="headphones"], input[placeholder*="item name"], input[placeholder*="Noise"]').first();
    const fallback = page.locator('input[type="text"]').first();
    const input = (await nameInput.count()) > 0 ? nameInput : fallback;
    await expect(input).toHaveValue("Wireless Headphones");
  });

  test("EditItemModal has Save Changes button", async ({ page }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(
      page.getByRole("button", { name: /save changes/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("EditItemModal Cancel button closes the modal", async ({ page }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(page.getByRole("heading", { name: /edit item/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /edit item/i }),
    ).not.toBeVisible();
  });

  test("EditItemModal closes on Escape key", async ({ page }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(page.getByRole("heading", { name: /edit item/i })).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: /edit item/i }),
    ).not.toBeVisible();
  });

  // ── Delete Item ──────────────────────────────────────────────────────────

  test("clicking Delete in item dropdown opens DeleteConfirmModal", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(
      page.getByRole("heading", { name: /delete item/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Delete Item modal shows confirmation text", async ({ page }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(
      page.getByText(/are you sure/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Delete Item modal Cancel closes without removing items", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open item menu" }).first().click();
    await page.locator('[class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(page.getByRole("heading", { name: /delete item/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /delete item/i }),
    ).not.toBeVisible();
    // Items should still be present
    await expect(page.getByText("Wireless Headphones")).toBeVisible();
  });

  // ── Wishlist actions menu ────────────────────────────────────────────────

  test("Wishlist actions button is visible in the header", async ({ page }) => {
    // WishlistHeader renders aria-label="Wishlist actions" on the MoreHorizontal button
    await expect(
      page.getByRole("button", { name: "Wishlist actions" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Wishlist actions reveals Edit and Delete options", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await expect(page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first()).toBeVisible();
    await expect(page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Delete" }).first()).toBeVisible();
  });

  // ── Edit Wishlist ────────────────────────────────────────────────────────

  test("clicking Edit in wishlist actions opens EditWishlistModal", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(
      page.getByRole("heading", { name: /edit wishlist/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("EditWishlistModal name field is pre-populated", async ({ page }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(page.getByRole("heading", { name: /edit wishlist/i })).toBeVisible({ timeout: 5_000 });
    // MOCK_WISHLISTS[0] title is "Birthday Wishes 🎂"
    const nameInput = page.locator('input[placeholder*="Birthday"], input[placeholder*="wishlist"], input[placeholder*="Birthday Wishes"]').first();
    const fallback = page.locator('input[type="text"]').first();
    const input = (await nameInput.count()) > 0 ? nameInput : fallback;
    await expect(input).toHaveValue("Birthday Wishes 🎂");
  });

  test("EditWishlistModal has privacy options", async ({ page }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();

    // Scope to the modal container so we don't match the visibility badge in the header
    const modal = page.locator("main").filter({
      has: page.getByRole("heading", { name: /edit wishlist/i }),
    });
    await expect(modal.getByRole("heading", { name: /edit wishlist/i })).toBeVisible({ timeout: 5_000 });

    // Privacy options render as <strong> elements — use exact match to avoid substring collisions
    await expect(modal.getByText("Public", { exact: true })).toBeVisible();
    await expect(modal.getByText("Friends Only", { exact: true })).toBeVisible();
    await expect(modal.getByText("Private", { exact: true })).toBeVisible();
  });

  test("EditWishlistModal Save Changes button is present", async ({ page }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(
      page.getByRole("button", { name: /save changes/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("EditWishlistModal Cancel button closes the modal", async ({ page }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Edit" }).first().click();
    await expect(page.getByRole("heading", { name: /edit wishlist/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /edit wishlist/i }),
    ).not.toBeVisible();
  });

  // ── Delete Wishlist ──────────────────────────────────────────────────────

  test("clicking Delete in wishlist actions opens DeleteConfirmModal", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(
      page.getByRole("heading", { name: /delete wishlist/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Delete Wishlist modal shows warning text", async ({ page }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(
      page.getByText(/are you sure/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Delete Wishlist modal Cancel closes without navigating away", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Wishlist actions" }).click();
    await page.locator('[class*="menuDropdown"] button, [class*="dropdown"] button').filter({ hasText: "Delete" }).first().click();
    await expect(page.getByRole("heading", { name: /delete wishlist/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /delete wishlist/i }),
    ).not.toBeVisible();
    // Still on the wishlist page
    expect(page.url()).toContain("/wishlist/wl-001");
  });

  // ── Inline edit ──────────────────────────────────────────────────────────

  test("inline edit pencil button is visible for the owner", async ({
    page,
  }) => {
    // WishlistHeader renders aria-label="Inline edit wishlist" on the Pencil button
    await expect(
      page.getByRole("button", { name: "Inline edit wishlist" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking inline edit button shows title input field", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Inline edit wishlist" }).click();
    // WishlistHeader renders <input placeholder="Wishlist title" />
    await expect(
      page.locator('input[placeholder="Wishlist title"]'),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("pressing Escape cancels inline editing", async ({ page }) => {
    await page.getByRole("button", { name: "Inline edit wishlist" }).click();
    await expect(
      page.locator('input[placeholder="Wishlist title"]'),
    ).toBeVisible({ timeout: 3_000 });
    await page.keyboard.press("Escape");
    await expect(
      page.locator('input[placeholder="Wishlist title"]'),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test("inline edit input is pre-filled with current wishlist title", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Inline edit wishlist" }).click();
    const input = page.locator('input[placeholder="Wishlist title"]');
    await expect(input).toBeVisible({ timeout: 3_000 });
    await expect(input).toHaveValue("Birthday Wishes 🎂");
  });
});
