import { describe, expect, it } from "vitest";
import { getSafeNotificationRoute } from "./notification-route";

describe("notification routes", () => {
  it.each(["/friends", "/secret-santa", "/wishlists/123e4567-e89b-42d3-a456-426614174000"])(
    "allows a known in-app destination: %s",
    (route) => {
      expect(getSafeNotificationRoute(route)).toBe(route);
    },
  );

  it.each([
    "https://example.com",
    "//example.com",
    "/subscription",
    "/wishlists/not-an-id",
    "/wishlists/123e4567-e89b-42d3-a456-426614174000?redirect=https://example.com",
    null,
  ])("rejects an untrusted destination: %s", (route) => {
    expect(getSafeNotificationRoute(route)).toBeNull();
  });
});
