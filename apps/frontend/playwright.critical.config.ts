import { defineConfig, devices } from "@playwright/test";

/**
 * Runner 1 — Critical flows.
 *
 * Covers the most important user journeys: auth, core wishlist CRUD,
 * friends, discovery, sharing, and navigation. These tests MUST pass
 * for the app to provide its core value.
 *
 * Run with: npm run test:e2e:critical
 */

const MOCK_SUPABASE_URL = "http://localhost:54321";
const MOCK_SUPABASE_ANON_KEY = "e2e-mock-anon-key";

export default defineConfig({
  testDir: "./e2e",
  snapshotDir: "./e2e/snapshots",
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

    /* ── Anonymous critical tests ── */
    {
      name: "anonymous",
      testMatch: /\/(landing|login)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },

    /* ── Authenticated critical tests ── */
    {
      name: "chromium",
      testMatch: [
        /\/home\.spec\.ts$/,
        /\/wishlist\.spec\.ts$/,
        /\/wishlist-crud\.spec\.ts$/,
        /\/auth-redirect\.spec\.ts$/,
        /\/friends\.spec\.ts$/,
        /\/discover\.spec\.ts$/,
        /\/share\.spec\.ts$/,
        /\/navigation\.spec\.ts$/,
      ],
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
