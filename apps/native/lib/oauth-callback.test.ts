import { describe, expect, it } from "vitest";
import { getOAuthAuthorizationCode, isExpectedOAuthCallbackUrl } from "./oauth-callback";

describe("OAuth callback validation", () => {
  const redirectTo = "wishlane://google-auth";

  it("accepts the requested redirect and extracts its one-time code", () => {
    const callback = "wishlane://google-auth?code=one-time-code";

    expect(isExpectedOAuthCallbackUrl(callback, redirectTo)).toBe(true);
    expect(getOAuthAuthorizationCode(callback, redirectTo)).toBe("one-time-code");
  });

  it.each([
    "other-app://google-auth?code=code",
    "wishlane://facebook-auth?code=code",
    "wishlane://google-auth/extra?code=code",
    "not a URL",
  ])("rejects an unexpected callback: %s", (callback) => {
    expect(isExpectedOAuthCallbackUrl(callback, redirectTo)).toBe(false);
    expect(() => getOAuthAuthorizationCode(callback, redirectTo)).toThrow(/did not match/);
  });

  it("surfaces provider errors without accepting a session", () => {
    expect(() =>
      getOAuthAuthorizationCode(
        "wishlane://google-auth?error=access_denied&error_description=Cancelled",
        redirectTo,
      ),
    ).toThrow("Cancelled");
  });

  it("rejects a matching callback without a code", () => {
    expect(() => getOAuthAuthorizationCode("wishlane://google-auth", redirectTo)).toThrow(
      /authorization code/,
    );
  });
});
