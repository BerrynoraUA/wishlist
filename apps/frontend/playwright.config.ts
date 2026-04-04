import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests use a mock Supabase server so no real database is needed.
 * The mock runs on :54321 and the Next.js dev server talks to it via
 * NEXT_PUBLIC_SUPABASE_URL.
 */

const MOCK_SUPABASE_URL = "http://localhost:54321";
const MOCK_SUPABASE_ANON_KEY = "e2e-mock-anon-key";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    /* ── Auth setup (runs first) ── */
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },

    /* ── Anonymous tests (no login needed) ── */
    {
      name: "anonymous",
      testMatch: /\/(landing|login)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },

    /* ── Authenticated tests ── */
    {
      name: "chromium",
      testIgnore: /\/(landing|login)\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],

  webServer: [
    /* ── Mock Supabase (must start first) ── */
    {
      command: "node e2e/mocks/mock-supabase-server.mjs",
      url: MOCK_SUPABASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
    /* ── Next.js dev server ── */
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: MOCK_SUPABASE_ANON_KEY,
      },
    },
  ],
});
