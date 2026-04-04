import { test as setup } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, ".auth", "user.json");

/**
 * Global setup: inject mock auth cookies so the Supabase SSR middleware
 * recognises the session. No real database or login flow is needed.
 *
 * The mock Supabase server (mock-supabase-server.mjs) validates any
 * access token so the middleware's `auth.getUser()` always succeeds.
 */
setup("authenticate", async ({ page }) => {
  const baseURL = "http://localhost:3000";

  // The @supabase/ssr library stores the session under a cookie whose
  // name is derived from the Supabase URL: sb-{hostname_prefix}-auth-token
  // For http://localhost:54321 the prefix is "localhost".
  const mockSession = {
    access_token: "e2e-mock-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "e2e-mock-refresh-token",
    user: {
      id: "e2e-mock-user-00000000-0000-0000-0000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "e2e-test@wishlane.app",
      email_confirmed_at: "2025-01-01T00:00:00Z",
      phone: "",
      confirmed_at: "2025-01-01T00:00:00Z",
      last_sign_in_at: "2026-04-03T10:00:00Z",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2026-04-03T10:00:00Z",
    },
  };

  // The Supabase SSR client may chunk large cookies, but our mock
  // session is small enough for a single cookie.
  const sessionJson = JSON.stringify(mockSession);

  // Supabase SSR v0.x uses "base64-" prefix + base64url encoding
  const cookieValue = "base64-" + Buffer.from(sessionJson).toString("base64url");

  await page.context().addCookies([
    {
      name: "sb-localhost-auth-token",
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    // Theme cookies to ensure consistent rendering
    { name: "bn_theme", value: "light", domain: "localhost", path: "/" },
    { name: "bn_resolved_theme", value: "light", domain: "localhost", path: "/" },
  ]);

  // Save storage state (includes cookies) for authenticated test projects
  await page.context().storageState({ path: authFile });
});
