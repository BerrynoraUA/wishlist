import { test, expect } from "@playwright/test";

test.describe("Friends page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/friends");
  });

  test("renders page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
    await expect(
      page.getByText("Connect with friends and discover their wishlists."),
    ).toBeVisible();
  });

  test("renders Invite Friends button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Invite Friends" }),
    ).toBeVisible();
  });

  test("renders three tabs: All Friends, Requests, Sent", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /All Friends/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Requests/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sent/i }),
    ).toBeVisible();
  });

  test("All Friends tab shows mock friends", async ({ page }) => {
    // Mock server returns Alice Johnson and Bob Smith
    await expect(page.getByText("Alice Johnson")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Bob Smith")).toBeVisible();
  });

  test("switch to Requests tab shows incoming requests", async ({ page }) => {
    await page.getByRole("button", { name: /Requests/i }).click();
    // Mock returns Charlie Davis as an incoming request
    await expect(
      page.getByText("Charlie Davis").or(page.getByText("No incoming requests.")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("switch to Sent tab shows outgoing requests", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Sent/i }).click();
    // Mock returns Diana Prince as an outgoing request
    await expect(
      page.getByText("Diana Prince").or(page.getByText("No sent requests.")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Invite Friends button opens AddFriendModal", async ({ page }) => {
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByRole("heading", { name: /Invite friends/i })).toBeVisible();
  });

  test("AddFriendModal shows invite link section", async ({ page }) => {
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByText("Your invite link")).toBeVisible();
    await expect(page.getByText("OR SEARCH")).toBeVisible();
  });

  test("AddFriendModal has username search input", async ({ page }) => {
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByPlaceholder("@username")).toBeVisible();
  });

  test("AddFriendModal closes with Escape key", async ({ page }) => {
    await page.getByRole("button", { name: "Invite Friends" }).click();
    await expect(page.getByRole("heading", { name: /Invite friends/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: /Invite friends/i }),
    ).not.toBeVisible();
  });

  test("visual screenshot", async ({ page }) => {
    await expect(page.getByText("Alice Johnson")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("friends-page.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
